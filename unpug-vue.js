const { resolve } = require('path');
const { opendirSync, readFileSync, writeFileSync } = require('fs');
const { render } = require('pug');

function processDir(path) {
    const dir = opendirSync(path);
    let entry = null;

    while (entry = dir.readSync()) {
        if (entry.isDirectory()) {
            processDir(resolve(path, entry.name));
            continue;
        } else if (entry.name.substr(-4).toLowerCase() != '.vue') {
            continue;
        }

        const contents = readFileSync(resolve(path, entry.name), { encoding: 'utf8' });

        if (!contents.includes('lang="pug"')) {
            continue;
        }

        let lineEnding = '\n';

        if (contents.includes('\r\n')) {
            lineEnding = '\r\n';
        }

        let lines = contents.split(lineEnding);
        let template = '';
        let start = null;
        let end = null;
        let indentCount = 0;
        let indentChar = null;

        for (let i = 0; i < lines.length; ++i) {
            if (lines[i].includes('<template')) {
                start = i;
                continue;
            } else if (lines[i].includes('</template')) {
                end = i;
                break;
            }

            if (start === null) {
                continue;
            } else if (i == start + 1) {
                for (let j = 0; j < lines[i].length; ++j) {
                    let char = lines[i].charAt(j);

                    if (![' ', '\t'].includes(char)) {
                        indentCount = j;
                        break;
                    }

                    indentChar = char;
                }
            }

            template += lines[i].substr(indentCount) + lineEnding;
        }

        if (end === null) {
            continue;
        }

        let newTemplate = render(template, {
            pretty: indentCount > 0 ? indentChar.repeat(indentCount) : '    ',
            doctype: 'html'
        });

        newTemplate = newTemplate
            .trim()
            .replace('\r\n', '\n')
            .split('\n')
            .map(str => indentChar.repeat(indentCount) + str);

        newTemplate.unshift(lines[start].replace(' lang="pug"', ''));
        newTemplate.push(lines[end]);

        lines.splice(start, end - start + 1, ...newTemplate);

        writeFileSync(resolve(path, entry.name), lines.join(lineEnding), { encoding: 'utf8' });
    }
}

processDir(__dirname);
