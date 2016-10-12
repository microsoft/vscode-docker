import { docker } from './utils/docker-endpoint';
import { ImageItem, quickPickImage } from './utils/quick-pick-image';


export function removeImage() {
    quickPickImage().then(function (selectedItem: ImageItem) {
        if (selectedItem) {
            for (let i = 0; i < selectedItem.ids.length; i++) {
                let image = docker.getImage(selectedItem.ids[i]);
                image.remove({ force: true }, function (err, data) {
                   // console.log("Removed - error: " + err);
                   // console.log("Removed - data: " + data);
                });
            }
        }
    });
}