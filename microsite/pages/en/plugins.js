/**
 * Copyright (c) 2017-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const fs = require('fs');
const yaml = require('js-yaml');
const React = require('react');
const Components = require(`${process.cwd()}/core/Components.js`);
const {
  Block: { Container },
  BulletLine,
} = Components;

const pluginsDirectory = require('path').join(process.cwd(), 'data/plugins');
const pluginMetadata = fs
  .readdirSync(pluginsDirectory)
  .map(file =>
    yaml.safeLoad(fs.readFileSync(`./data/plugins/${file}`, 'utf8')),
  );
const truncate = text =>
  text.length > 170 ? text.substr(0, 170) + '...' : text;

const addPluginDocsLink = '/docs/plugins/add-to-marketplace';
const defaultIconUrl = 'img/logo-gradient-on-dark.svg';

const Plugins = () => (
  <main className="MainContent">
    <div className="PluginPageLayout">
      <div className="PluginPageHeader">
        <h2>Plugins</h2>
        <span>
          <a
            className="PluginAddNewButton ButtonFilled"
            href={addPluginDocsLink}
          >
            <b>Add Plugin</b>
          </a>
        </span>
      </div>
      <BulletLine style={{ width: '100% ' }} />
      <Container wrapped className="grid">
        {pluginMetadata.map(
          ({
            iconUrl,
            title,
            description,
            author,
            authorUrl,
            documentation,
            category,
          }) => (
            <div className="PluginCard">
              <div className="PluginCardHeader">
                <img src={iconUrl || defaultIconUrl} alt={title} />
                <h2 className="PluginCardTitle">{title}</h2>
                <p className="Author">
                  by <a href={authorUrl}>{author}</a>
                </p>
                <span className="ChipOutlined">{category}</span>
              </div>
              <div className="PluginCardBody">
                <p>{truncate(description)}</p>
              </div>
              <Container className="PluginCardFooter">
                <span>
                  <a
                    className="PluginCardLink ButtonFilled"
                    href={documentation}
                  >
                    docs
                  </a>
                </span>
              </Container>
            </div>
          ),
        )}
      </Container>
    </div>
  </main>
);

module.exports = Plugins;
