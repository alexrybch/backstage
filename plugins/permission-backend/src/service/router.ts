/*
 * Copyright 2020 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { errorHandler, SingleHostDiscovery } from '@backstage/backend-common';
import express, { Request, Response } from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import {
  BackstageIdentity,
  IdentityClient,
} from '@backstage/plugin-auth-backend';
import { Config } from '@backstage/config';
import {
  IdentifiedAuthorizeRequest,
  IdentifiedAuthorizeRequestJSON,
  AuthorizeResult,
  IdentifiedAuthorizeResponse,
  Permission,
  AuthorizeRequestContext,
} from '@backstage/permission-common';
import { PermissionHandler } from '../handler';

export interface RouterOptions {
  logger: Logger;
  config: Config;
  permissionHandlers: PermissionHandler[];
}

const handleRequest = async (
  { id, ...request }: IdentifiedAuthorizeRequest<AuthorizeRequestContext>,
  user: BackstageIdentity | undefined,
  permissionHandlers: PermissionHandler[],
): Promise<IdentifiedAuthorizeResponse> => {
  for (const handler of permissionHandlers) {
    const response = await handler.handle(request, user);

    if (response.result !== AuthorizeResult.DEFER) {
      return {
        ...response,
        id,
      };
    }
  }

  // Default to DENY for any requests not handled by any PermissionHandler
  return {
    result: AuthorizeResult.DENY,
    id,
  };
};

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { config, permissionHandlers } = options;
  const discovery = SingleHostDiscovery.fromConfig(config);
  const identity = new IdentityClient({
    discovery,
    issuer: await discovery.getExternalBaseUrl('auth'),
  });

  const router = Router();
  router.use(express.json());

  router.post(
    '/authorize',
    async (
      req: Request<IdentifiedAuthorizeRequestJSON[]>,
      res: Response<IdentifiedAuthorizeResponse[]>,
    ) => {
      // TODO(mtlewis/orkohunter): Payload too large errors happen when internal backends (techdocs, search, etc.) try
      // to fetch all of entities.
      // Fix1: The request should only contain entity refs instead of full entity.
      // Fix2: We should probably not filter requests from other backends -
      // either by allowing them a superuser token or treating their requests separately from a user's request.
      const token = IdentityClient.getBearerToken(req.header('authorization'));
      const user = token ? await identity.authenticate(token) : undefined;

      const body: IdentifiedAuthorizeRequestJSON[] = req.body;
      const authorizeRequests = body.map(({ permission, ...rest }) => ({
        ...rest,
        permission: Permission.fromJSON(permission),
      }));

      // TODO(timbonicus/joeporpeglia): wire up frontend to supply id, accept array of permission requests
      res.json(
        await Promise.all(
          authorizeRequests.map(request =>
            handleRequest(request, user, permissionHandlers),
          ),
        ),
      );
    },
  );

  router.use(errorHandler());
  return router;
}
