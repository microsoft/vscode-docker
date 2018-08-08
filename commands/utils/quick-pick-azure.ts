import { ContainerRegistryManagementClient } from 'azure-arm-containerregistry';
import { Registry } from 'azure-arm-containerregistry/lib/models';
import * as vscode from "vscode";
import * as acrTools from '../../utils/Azure/acrTools';
import { AzureImage } from "../../utils/Azure/models/image";
import { Repository } from "../../utils/Azure/models/Repository";
import { AzureUtilityManager } from '../../utils/azureUtilityManager';

/**
 * function to allow user to pick a desired image for use
 * @param repository the repository to look in
 * @returns an AzureImage object (see azureUtils.ts)
 */
export async function quickPickACRImage(repository: Repository): Promise<AzureImage> {
    const repoImages: AzureImage[] = await acrTools.getAzureImages(repository);
    let imageListNames: string[] = [];
    for (let tempImage of repoImages) {
        imageListNames.push(tempImage.tag);
    }
    let desiredImage = await vscode.window.showQuickPick(imageListNames, { 'canPickMany': false, 'placeHolder': 'Choose the image you want to delete' });
    if (!desiredImage) { return; }
    const image = repoImages.find((myImage): boolean => { return desiredImage === myImage.tag });
    return image;
}

/**
 * function to allow user to pick a desired repository for use
 * @param registry the registry to choose a repository from
 * @returns a Repository object (see azureUtils.ts)
 */
export async function quickPickACRRepository(registry: Registry): Promise<Repository> {
    const myRepos: Repository[] = await acrTools.getAzureRepositories(registry);
    let rep: string[] = [];
    for (let repo of myRepos) {
        rep.push(repo.name);
    }
    let desiredRepo = await vscode.window.showQuickPick(rep, { 'canPickMany': false, 'placeHolder': 'Choose the repository from which your desired image exists' });
    if (!desiredRepo) { return; }
    const repository = myRepos.find((currentRepo): boolean => { return desiredRepo === currentRepo.name });
    return repository;
}

/**
 * function to let user choose a registry for use
 * @returns a Registry object
 */
export async function quickPickACRRegistry(): Promise<Registry> {
    //first get desired registry
    let registries = await AzureUtilityManager.getInstance().getRegistries();
    let reg: string[] = [];
    for (let registryName of registries) {
        reg.push(registryName.name);
    }
    let desired = await vscode.window.showQuickPick(reg, { 'canPickMany': false, 'placeHolder': 'Choose the Registry from which your desired image exists' });
    if (!desired) { return; }
    const registry = registries.find((currentReg): boolean => { return desired === currentReg.name });
    return registry;
}
