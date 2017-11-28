"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var protractor_1 = require("../../../app/frontend/node_modules/protractor");
var AppPage = (function () {
    function AppPage() {
    }
    AppPage.prototype.navigateTo = function () {
        return protractor_1.browser.get('/');
    };
    AppPage.prototype.getParagraphText = function () {
        return protractor_1.element(protractor_1.by.css('app-root h1')).getText();
    };
    return AppPage;
}());
exports.AppPage = AppPage;
