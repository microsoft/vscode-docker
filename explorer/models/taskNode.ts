import * as ContainerModels from 'azure-arm-containerregistry/lib/models';
import { SubscriptionModels } from 'azure-arm-resource';
import * as opn from 'opn';
import * as vscode from 'vscode';
import { AzureAccount } from '../../typings/azure-account.api';
import * as acrTools from '../../utils/Azure/acrTools';
import { AzureUtilityManager } from '../../utils/azureUtilityManager';
import { NodeBase } from './nodeBase';
/* Single TaskRootNode under each Repository. Labeled "Build Tasks" */
export class TaskRootNode extends NodeBase {
    public static readonly contextValue: string = 'taskRootNode';
    private _onDidChangeTreeData: vscode.EventEmitter<NodeBase> = new vscode.EventEmitter<NodeBase>();
    public readonly onDidChangeTreeData: vscode.Event<NodeBase> = this._onDidChangeTreeData.event;
    constructor(
        public readonly label: string,
        public subscription: SubscriptionModels.Subscription,
        public readonly azureAccount: AzureAccount,
        public registry: ContainerModels.Registry,
        public readonly iconPath: any = null,
    ) {
        super(label);
    }

    public name: string;
    public getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: TaskRootNode.contextValue,
            iconPath: this.iconPath
        }
    }

    /* Making a list view of BuildTaskNodes, or the Build Tasks of the current registry */
    public async getChildren(element: TaskRootNode): Promise<BuildTaskNode[]> {
        const buildTaskNodes: BuildTaskNode[] = [];
        let buildTasks: ContainerModels.BuildTask[] = [];
        const client = AzureUtilityManager.getInstance().getContainerRegistryManagementClient(element.subscription);
        const resourceGroup: string = acrTools.getResourceGroupName(element.registry);
        buildTasks = await client.buildTasks.list(resourceGroup, element.registry.name);
        if (buildTasks.length === 0) {
            vscode.window.showInformationMessage(`You do not have any Build Tasks in the registry, '${element.registry.name}'. You can create one with ACR Build. `, "Learn More").then(val => {
                if (val === "Learn More") {
                    opn('https://aka.ms/acr/buildtask');
                }
            })
        }

        for (let buildTask of buildTasks) {
            let node = new BuildTaskNode(buildTask, element.registry, element.subscription, element);
            buildTaskNodes.push(node);
        }
        return buildTaskNodes;
    }
}

export class BuildTaskNode extends NodeBase {
    public static readonly contextValue: string = 'buildTaskNode';
    public label: string;

    constructor(
        public task: ContainerModels.BuildTask,
        public registry: ContainerModels.Registry,

        public subscription: SubscriptionModels.Subscription,
        public parent: NodeBase

    ) {
        super(task.name);
    }

    public getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            contextValue: BuildTaskNode.contextValue,
            iconPath: null
        }
    }
}
