"use strict";

const { app, dialog } = require("electron");
const { execFile } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { promisify } = require("node:util");
const settings = require("../settings");

const execFileAsync = promisify(execFile);
const MAILTO_MIME = "x-scheme-handler/mailto";
const HANDLER_DESKTOP_ID = "harbour-mail-mailto.desktop";

function isSafeDesktopId(value) {
  return (
    typeof value === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9._+-]*\.desktop$/.test(value)
  );
}

function quoteDesktopExec(value) {
  return `"${value.replace(/([\\\"`$])/g, "\\$1")}"`;
}

function buildMailtoDesktopEntry(executablePath) {
  if (
    typeof executablePath !== "string" ||
    !path.isAbsolute(executablePath) ||
    /[\u0000-\u001f\u007f]/.test(executablePath)
  ) {
    throw new TypeError("A safe absolute executable path is required");
  }

  return [
    "[Desktop Entry]",
    "Type=Application",
    "Name=Harbour Mail (Mail Links)",
    "Comment=Compose mail in Harbour Mail",
    `Exec=${quoteDesktopExec(executablePath)} --ozone-platform=wayland %U`,
    "Icon=prospect-mail",
    "NoDisplay=true",
    "Terminal=false",
    `MimeType=${MAILTO_MIME};`,
    "",
  ].join("\n");
}

class MailtoHandler {
  constructor() {
    this.applicationsDirectory = path.join(
      app.getPath("home"),
      ".local",
      "share",
      "applications"
    );
    this.desktopFile = path.join(
      this.applicationsDirectory,
      HANDLER_DESKTOP_ID
    );
  }

  isEnabled() {
    return settings.get("mailtoHandlerEnabled") === true;
  }

  isAvailable() {
    return (
      process.platform === "linux" &&
      app.isPackaged &&
      !process.env.APPIMAGE &&
      !process.env.SNAP &&
      !process.env.FLATPAK_ID
    );
  }

  async queryDefault() {
    try {
      const { stdout } = await execFileAsync("/usr/bin/xdg-mime", [
        "query",
        "default",
        MAILTO_MIME,
      ]);
      const desktopId = stdout.trim();
      return isSafeDesktopId(desktopId) ? desktopId : "";
    } catch {
      return "";
    }
  }

  async updateDesktopDatabase() {
    if (!fs.existsSync("/usr/bin/update-desktop-database")) return;
    await execFileAsync("/usr/bin/update-desktop-database", [
      this.applicationsDirectory,
    ]);
  }

  async enable() {
    if (!this.isAvailable()) return false;
    const currentDefault = await this.queryDefault();
    const { response } = await dialog.showMessageBox({
      type: "question",
      buttons: ["Cancel", "Use Harbour Mail"],
      defaultId: 0,
      cancelId: 0,
      title: "Use Harbour Mail for Mail Links?",
      message: "Make Harbour Mail the default application for mailto: links?",
      detail:
        "This changes your desktop mail-link preference only after confirmation. You can restore the previous handler from this menu.",
    });
    if (response !== 1) return false;

    await fs.promises.mkdir(this.applicationsDirectory, {
      recursive: true,
      mode: 0o700,
    });
    await fs.promises.writeFile(
      this.desktopFile,
      buildMailtoDesktopEntry(process.execPath),
      { mode: 0o600 }
    );
    await this.updateDesktopDatabase();
    await execFileAsync("/usr/bin/xdg-mime", [
      "default",
      HANDLER_DESKTOP_ID,
      MAILTO_MIME,
    ]);
    if ((await this.queryDefault()) !== HANDLER_DESKTOP_ID) {
      throw new Error("The desktop did not accept the mail-link preference");
    }

    if (
      currentDefault &&
      currentDefault !== HANDLER_DESKTOP_ID
    ) {
      settings.set("previousMailtoHandler", currentDefault);
    }
    settings.set("mailtoHandlerEnabled", true);
    return true;
  }

  async disable({ confirm = true } = {}) {
    if (process.platform !== "linux") return false;
    const previous = settings.get("previousMailtoHandler");
    if (!isSafeDesktopId(previous) || previous === HANDLER_DESKTOP_ID) {
      throw new Error("No safe previous mail handler is available");
    }

    if (confirm) {
      const { response } = await dialog.showMessageBox({
        type: "question",
        buttons: ["Cancel", "Restore Previous Handler"],
        defaultId: 0,
        cancelId: 0,
        title: "Restore Previous Mail Handler?",
        message: "Stop using Harbour Mail for mailto: links?",
        detail: "Your previously selected desktop mail handler will be restored.",
      });
      if (response !== 1) return false;
    }

    await execFileAsync("/usr/bin/xdg-mime", [
      "default",
      previous,
      MAILTO_MIME,
    ]);
    if ((await this.queryDefault()) !== previous) {
      throw new Error("The previous mail handler could not be restored");
    }

    await fs.promises.rm(this.desktopFile, { force: true });
    await this.updateDesktopDatabase();
    settings.set("mailtoHandlerEnabled", false);
    settings.delete("previousMailtoHandler");
    return true;
  }

  async toggle() {
    return this.isEnabled() ? this.disable() : this.enable();
  }
}

module.exports = {
  HANDLER_DESKTOP_ID,
  MailtoHandler,
  buildMailtoDesktopEntry,
  isSafeDesktopId,
};
