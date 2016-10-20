import { docker } from './utils/docker-endpoint';
import { ImageItem, quickPickImage } from './utils/quick-pick-image';


export function removeImage() {
    quickPickImage(true).then(function (selectedItem: ImageItem) {
        if (selectedItem) {

            // if we're removing all images, remove duplicate IDs, a result of tagging
            if (selectedItem.label.toLowerCase().includes('all images')) {
                selectedItem.ids = Array.from(new Set(selectedItem.ids));
            }

            for (let i = 0; i < selectedItem.ids.length; i++) {
                let image = docker.getImage(selectedItem.ids[i]);

                // image.remove removes by ID, so to remove a single *tagged* image we
                // just overwrite the name. this is a hack around the dockerode api
                if (selectedItem.ids.length === 1) {
                    image.name = selectedItem.label;
                }

                image.remove({ force: true }, function (err, data) {
                    // console.log("Removed - error: " + err);
                    // console.log("Removed - data: " + data);
                });
            }
        }
    });
}