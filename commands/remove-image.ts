import {docker} from './utils/docker-endpoint';
import {ImageItem, quickPickImage} from './utils/quick-pick-image';


export function removeImage() {
    quickPickImage().then(function (selectedItem: ImageItem) {
        if (selectedItem) {
            let image = docker.getImage(selectedItem.id);
            image.remove({ force: true }, function (err, data) {
                // console.log("Removed - error: " + err);
                // console.log("Removed - data: " + data);
            });
        }
    });
}