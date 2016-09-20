import {docker} from './utils/docker-endpoint';
import {ContainerItem, quickPickContainer} from './utils/quick-pick-container';


export function stopContainer() {
    quickPickContainer(true).then(function (selectedItem: ContainerItem) {
        if (selectedItem) {
            for (let i = 0; i < selectedItem.ids.length; i++) {
                let container = docker.getContainer(selectedItem.ids[i]);
                container.stop(function (err, data) {
                    // console.log("Stopped - error: " + err);
                    // console.log("Stopped - data: " + data);
                });
            }
        }
    });
}