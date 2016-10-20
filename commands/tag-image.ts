import vscode = require('vscode');
import { ImageItem, quickPickImage } from './utils/quick-pick-image';
import { docker } from './utils/docker-endpoint';


export function tagImage() {

    quickPickImage(false).then(function (selectedItem: ImageItem) {
        if (selectedItem) {

            var imageName: string;

            var opt: vscode.InputBoxOptions = {
                ignoreFocusOut: true,
                placeHolder: selectedItem.label,
                prompt: 'Tag image with...',
                value: selectedItem.label
            };

            vscode.window.showInputBox(opt).then((value: string) => {
                if (value) {
                    var repo: string = value;
                    var tag: string = 'latest';
                    if (value.lastIndexOf(':') > 0) {
                        repo = value.slice(0, value.lastIndexOf(':'));
                        tag = value.slice(value.lastIndexOf(':') + 1);
                    }
                    let image = docker.getImage(selectedItem.ids[0]);
                    image.tag( {repo: repo, tag: tag}, function (err, data) {
                        if (err) {
                            console.log('Docker Tag error: ' + err);
                        }
                    });
                }
            });
        };
    });
}