export class EntryJsonPipe {
    static transform(value: string): any {
        try {
            let comment = JSON.parse(value);
            let text = "";
            // let color_i = 'black';
            // let keys = comment.keys().sort();
            // for (let property in comment.keys().sort()) {
            //     if (keys.hasOwnProperty(property) && comment[property] !== "") {
            //         text += '<p>' + property + ' : ' + comment[property] + '</p>';
            //     }
            // }
            //#1a9641 - green
            //#a6d96a - light green
            //#dde927 - yellow
            //#fdae61 - orange
            //#d7191c - red

            // if (columnName === 'cdr3fix') {
            //     if (comment['good'] === false) {
            //         color_i = '#d7191c';
            //     } else if (comment['fixNeeded'] === true) {
            //         if (comment['cdr3'] === comment['cdr3_old']) {
            //             color_i = '#dde927';
            //         } else {
            //             color_i = '#fdae61';
            //         }
            //     } else {
            //         color_i = '#1a9641';
            //     }
            // }

            //return '<i class="info circle icon" data-html="' + text + '" data-title="title" data-variation="wide" data-position="top right"></i>';
            return '';
        } catch (e) {
            return '';
        }
    }
}