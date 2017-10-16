/*
 *    Copyright 2017 Bagaev Dmitry
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

const glob = require('glob');
const path = require('path');
const fs = require('fs');
const ajaxObservableSourceFilePath = path.resolve(__dirname, '../node_modules/rxjs/src/observable/dom/AjaxObservable.ts');
const generateObservableSourceFilePath = path.resolve(__dirname, '../node_modules/rxjs/src/observable/GenerateObservable.ts');
const fromEventObservableSourceFilePath = path.resolve(__dirname, '../node_modules/rxjs/src/observable/FromEventObservable.ts');

if (fs.existsSync(ajaxObservableSourceFilePath)) {
    // XMLHttpRequestResponseType
    // xhr.responseType = request.responseType;

    let content = fs.readFileSync(ajaxObservableSourceFilePath, 'utf8');
    if (content) {
        console.log('Patching ' + ajaxObservableSourceFilePath);
        content = content.replace(/request\.responseType;/g, 'request.responseType as XMLHttpRequestResponseType;');
        fs.writeFileSync(ajaxObservableSourceFilePath, content, 'utf8');
    }
}

if (fs.existsSync(generateObservableSourceFilePath)) {
    // ResultFunc<S, T>
    // selfSelector,
    let content = fs.readFileSync(generateObservableSourceFilePath, 'utf8');
    if (content) {
        console.log('Patching ' + generateObservableSourceFilePath);
        content = content.replace(/selfSelector,/g, 'selfSelector as ResultFunc<S, T>,');
        fs.writeFileSync(generateObservableSourceFilePath, content, 'utf8');
    }
}

if (fs.existsSync(fromEventObservableSourceFilePath)) {
    // // static create<T>(target: EventTargetLike, eventName: string, selector: SelectorMethodSignature<T>): Observable<T>;
    let content = fs.readFileSync(fromEventObservableSourceFilePath, 'utf8');
    if (content) {
        console.log('Patching ' + fromEventObservableSourceFilePath);
        const regexp = /static create<T>\(target: EventTargetLike, eventName: string, selector: SelectorMethodSignature<T>\): Observable<T>;/g;
        const replaceString = '// static create<T>(target: EventTargetLike, eventName: string, selector: SelectorMethodSignature<T>): Observable<T>;';
        content = content.replace(regexp, replaceString);
        fs.writeFileSync(fromEventObservableSourceFilePath, content, 'utf8');
    }
}