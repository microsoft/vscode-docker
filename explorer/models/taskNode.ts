import * as ContainerModels from 'azure-arm-containerregistry/lib/models';
import { SubscriptionModels } from 'azure-arm-resource';
import * as opn from 'opn';
import * as vscode from 'vscode';
import { AzureAccount } from '../../typings/azure-account.api';
import * as acrTools from '../../utils/Azure/acrTools';
import { AzureUtilityManager } from '../../utils/azureUtilityManager';
import { NodeBase } from './nodeBase';
/* Single TaskRootNode under each Repository. Labeled "Tasks" */
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

    /* Making a list view of TaskNodes, or the Tasks of the current registry */
    public async getChildren(element: TaskRootNode): Promise<TaskNode[]> {
        const taskNodes: TaskNode[] = [];
        let tasks: ContainerModels.Task[] = [];
        const client = AzureUtilityManager.getInstance().getContainerRegistryManagementClient(element.subscription);
        const resourceGroup: string = acrTools.getResourceGroupName(element.registry);
        tasks = await client.tasks.list(resourceGroup, element.registry.name);
        if (tasks.length === 0) {
            vscode.window.showInformationMessage(`You do not have any Tasks in the registry, '${element.registry.name}'. You can create one with ACR Task. `, "Learn More").then(val => {
                if (val === "Learn More") {
                    opn('https://aka.ms/acr/task');
                }
            })
        }

        for (let task of tasks) {
            let node = new TaskNode(task, element.registry, element.subscription, element);
            taskNodes.push(node);
        }
        return taskNodes;
    }
}

export class TaskNode extends NodeBase {
    public static readonly contextValue: string = 'taskNode';
    public label: string;

    constructor(
        public task: ContainerModels.Task,
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
            contextValue: TaskNode.contextValue,
            iconPath: null
        }
    }
}
