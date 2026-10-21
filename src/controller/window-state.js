"use strict";

function chooseShowAction({ isMinimized, isVisible }) {
  if (isMinimized) return "restore";
  return isVisible ? "focus" : "show";
}

module.exports = { chooseShowAction };
