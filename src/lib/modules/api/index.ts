import { Embark, Events } from "../../../typings/embark";
import {canonicalHost} from "../../utils/host.js";
import {findNextPort} from "../../utils/network";
import Server from "./server";

const utils = require("../../utils/utils.js");

const DEFAULT_PORT = 55555;

export default class Api {
  private port!: number;
  private api!: Server;

  constructor(private embark: Embark, private options: any) {
    this.embark.events.emit("status", __("Starting API"));
    findNextPort(DEFAULT_PORT).then((port) => {
      this.port = port;
      this.api = new Server(this.embark, this.port, options.plugins);

      this.listenToCommands();
      this.registerConsoleCommands();

      this.embark.events.request("processes:register", "api", {
        launchFn: (cb) => this.api.start().then(cb),
        stopFn: (cb) => this.api.stop().then(cb),
      });

      this.embark.events.request("processes:launch", "api", (_err, message, port) => {
        this.embark.logger.info(message);
        this.setServiceCheck();
      });
    });
  }

  private setServiceCheck() {
    this.embark.events.request("services:register", "api", (cb) => {
      const url = "http://" + canonicalHost("127.0.0.1") + ":" + this.port;
      utils.checkIsAvailable(url, (isAvailable: boolean) => {
        const devServer = __("API") + " (" + url + ")";
        const serverStatus = (isAvailable ? "on" : "off");
        return cb({name: devServer, status: serverStatus});
      });
    });

    this.embark.events.on("check:wentOffline:Webserver", () => {
      this.embark.logger.info(__("API is offline"));
    });
  }

  private listenToCommands() {
    this.embark.events.setCommandHandler("start-api", (cb) => this.embark.events.request("processes:launch", "webserver", cb));
    this.embark.events.setCommandHandler("stop-api",  (cb) => this.embark.events.request("processes:stop", "webserver", cb));
    this.embark.events.setCommandHandler("logs:api:turnOn",  (cb) => {
      this.api.enableLogging();
      cb();
    });
    this.embark.events.setCommandHandler("logs:api:turnOff",  (cb) => {
      this.api.disableLogging();
      cb();
    });
  }

  private registerConsoleCommands() {
    this.embark.registerConsoleCommand({
      description: __("Start or stop the API"),
      matches: ["api start"],
      process: (cmd: string, callback) => {
        this.embark.events.request("start-api", callback);
      },
      usage: "api start/stop",
    });

    this.embark.registerConsoleCommand({
      matches: ["api stop"],
      process: (cmd: string, callback) => {
        this.embark.events.request("stop-api", callback);
      },
    });

    this.embark.registerConsoleCommand({
      matches: ["log api on"],
      process: (cmd: string, callback) => {
        this.embark.events.request("logs:webserver:turnOn", callback);
      },
    });

    this.embark.registerConsoleCommand({
      matches: ["log api off"],
      process: (cmd: string, callback) => {
        this.embark.events.request("logs:webserver:turnOff", callback);
      },
    });
  }
}
