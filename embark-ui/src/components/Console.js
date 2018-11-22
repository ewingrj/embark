import PropTypes from "prop-types";
import React, {Component} from 'react';
import Convert from 'ansi-to-html';
import equal from 'deep-equal';
import { Col, Row,  TabContent, TabPane, Nav, NavItem, NavLink } from 'reactstrap';
import classnames from 'classnames';
import {AsyncTypeahead} from 'react-bootstrap-typeahead';
import ReactJson from 'react-json-view';

import Logs from "./Logs";
import "./Console.css";
import {EMBARK_PROCESS_NAME} from '../constants';

const convert = new Convert();

const DEFAULT_INDEX = -1;

class Console extends Component {
  constructor(props) {
    super(props);
    this.typeahead = React.createRef();
    this.state = {value: '', isLoading: true, options: [], activeTab: EMBARK_PROCESS_NAME, suggestions: []};
  }

  shouldUpdateSuggestions(prevProps) {
    return !equal(prevProps.commandHistory, this.props.commandHistory) ||
      !equal(prevProps.commandSuggestions, this.props.commandSuggestions) ||
      (this.state.suggestions.length === 0 && (this.props.commandSuggestions.length > 0 || this.props.commandHistory.length > 0))
  }

  componentDidUpdate(prevProps) {
    if (this.shouldUpdateSuggestions(prevProps)) {
      const formattedCommandHistory = this.props.commandHistory.filter((value, index, self) => self.indexOf(value) === index)
        .map(command => ({value: command, command_type: "History", description: "Command you already typed"}));
      this.setState({suggestions: this.props.commandSuggestions.concat(formattedCommandHistory)})
    }
  }

  clear() {
    this.setState({value: '', historyIndex: DEFAULT_INDEX});
    this.typeahead.getInstance().clear();
  }

  handleSubmit(event) {
    event.preventDefault();
    this.props.postCommand(this.state.value);
    this.clear();
  }

  handleChange(value, cb) {
    this.setState({value: value}, cb);
  }

  toggle(tab) {
    if (this.state.activeTab !== tab) {
      this.setState({
        activeTab: tab
      });
      this.props.updateTab(tab);
    }
  }

  renderNav() {
    return (
      <Nav tabs>
        {this.props.processes.map((process) => (
          <NavItem key={process.name}>
            <NavLink
              className={classnames({ active: this.state.activeTab === process.name })}
              onClick={() => { this.toggle(process.name); }}
          >
            {process.name}
          </NavLink>
        </NavItem>
        ))}

      </Nav>
    );
  }

  isJsonObject(item) {
    if (!item.result) return false;
    try {
      return typeof (JSON.parse(item.result)) === 'object';
    } catch(_err) {
      return false;
    }
  }

  logClassName(item) {
    return classnames('m-0', {
      'text-info': item.logLevel === 'debug',
      'text-danger': item.logLevel === 'error',
      'text-warning': item.logLevel === 'warning'
    });
  }

  renderTabs() {
    const {processLogs, processes} = this.props;

    return (
      <TabContent activeTab={this.state.activeTab}>
        {processes.map(process => (
          <TabPane key={process.name} tabId={process.name}>
            <Logs>
              {processLogs
                .filter((item) => item.name === process.name)
                .reverse()
                .map((item, i) => {

                  if (this.isJsonObject(item)) {
                    return(
                      <div>
                        <p key={i} className={this.logClassName(item)} dangerouslySetInnerHTML={{__html: (convert.toHtml(item.command || ""))}}></p>
                        <ReactJson src={JSON.parse(item.result)} theme="monokai" sortKeys={true} collapsed={1} />
                      </div>
                    );
                  }

                  return (
                    <p key={i} className={this.logClassName(item)} dangerouslySetInnerHTML={{__html: (convert.toHtml(item.command || "") + convert.toHtml(item.msg))}}></p>
                  );
                })
              }
            </Logs>
            {process.name === "embark" &&
              <AsyncTypeahead
                autoFocus={true}
                emptyLabel={false}
                labelKey="value"
                multiple={false}
                maxResults={10}
                minLength={0}
                isLoading={this.state.isLoading}
                onInputChange={(text) => this.handleChange(text)}
                onChange={(text) => {
                  if (text && text[0]) {
                    this.handleChange(text[0].value);
                  }
                }}
                ref={(typeahead) => this.typeahead = typeahead}
                searchText={false}
                onKeyDown={(e) => {
                  switch(e.keyCode) {
                    case 13: {
                      this.handleChange(e.target.value, () => {
                        this.handleSubmit(e);
                      });
                      break;
                    }
                    case 27: {
                      this.clear();
                      break;
                    }
                    default: break;
                  }
                }}
                onSearch={(value) => {
                  this.props.postCommandSuggestions(value);
                }}
                filterBy={['value', 'description']}
                maxHeight="200px"
                placeholder="Type a command (e.g help)"
                options={this.state.suggestions}
                renderMenuItemChildren={(option) => (
                  <div>
                    {option.value}
                    <div>
                      <small>{option.command_type} - {option.description}</small>
                    </div>
                  </div>
                )}
              />
            }

          </TabPane>
        ))}
      </TabContent>
    );
  }

  render() {
    return (
      <Row>
        <Col>
          {this.renderNav()}
          {this.renderTabs()}
        </Col>
      </Row>
    );
  }
}

Console.propTypes = {
  commandHistory: PropTypes.arrayOf(PropTypes.string),
  postCommand: PropTypes.func,
  postCommandSuggestions: PropTypes.func,
  isEmbark: PropTypes.func,
  processes: PropTypes.arrayOf(PropTypes.object).isRequired,
  commandSuggestions: PropTypes.arrayOf(PropTypes.object),
  processLogs: PropTypes.arrayOf(PropTypes.object).isRequired,
  updateTab: PropTypes.func
};

export default Console;
