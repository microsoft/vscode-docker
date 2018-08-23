
let alphaNum = new RegExp('^[a-zA-Z0-9]*$');

export function isValidAzureName(value: string): { isValid: boolean, message?: string } {
    if (value.length < 5 || value.length > 50) {
        return { isValid: false, message: 'Registry name must be between 5 and 50 characters' };
    } else if (!alphaNum.test(value)) {
        return { isValid: false, message: 'Registry name may contain alpha numeric characters only' };
    } else {
        return { isValid: false };
    }
}
