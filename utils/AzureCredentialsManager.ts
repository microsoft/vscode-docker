class AzureCredentialsManager {

    private static _instance:AzureCredentialsManager = new AzureCredentialsManager();

    constructor() {
        if(AzureCredentialsManager._instance){
            throw new Error("Error: Instantiation failed: Use SingletonClass.getInstance() instead of new.");
        }
        AzureCredentialsManager._instance = this;
    }

    public static getInstance():AzureCredentialsManager
    {
        return AzureCredentialsManager._instance;
    }
}