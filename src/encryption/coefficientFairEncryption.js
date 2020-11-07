// COEFFICIENT FAIR ENCRYPTION SYSTEM. WRITTEN BY RUZGAR ATA OZKAN

/*
    ======================================================================================

    This encryption system is designed to be used in the client side
    and its aim is to protect passwords from the internet traffic while being sent to the server.
    So is anyone to capture the password from the internet traffic is going to get the encrypted password.
*/

function encryptPassword(password="") {
    if (typeof password !== 'string') {
        console.error(' # THE TYPE OF PASSWORD IS NOT VALID!');
        console.error(' # IT HAS TO BE A STRING...');
        return null;
    }

    function randomUpperCase(letter="") {
        const randomNum = Math.floor(Math.random() * 2);
        if (randomNum == 1) {
            return letter.toUpperCase();
        }
        return letter.toLowerCase();
    }

    const letters = 'qwertyuiopasdfghjklzxcvbnm1234567890!&?$'.split('');
    const complexity = 4; // the complexity has to be 1 character number otherwise the algorithm cannot calculate the coefficients, will improve in the future
    let coefficients = [];
    let coefficient = 0;
    let encryption = '';
    let encryptedPassword = '';
    let encryptedCoefficient = '';
    // console.log(' ~ Encrypting password... ');
    for (let i = 0; i < password.length; i++) {
        coefficient = Math.floor(Math.random() * complexity + complexity);
        coefficients.push(coefficient);
        for (let j = 0; j < coefficient; j++) {
            const randomNum = Math.floor(Math.random() * letters.length);
            const generatedCode = randomUpperCase(letters[randomNum]);
            encryption = encryption + generatedCode;
        }
        encryptedPassword = encryptedPassword + encryption + password[i];
        encryption = '';
    }
    // console.log(' ~ Password encryption is done. ');

    // ================== second phase ==================================

    const newCoefficients = [];
    coefficient = 0;
    // console.log(' ~ Encrypting coefficients... ');
    for (let i = 0; i < coefficients.length; i++) {
        coefficient = Math.floor(Math.random() * complexity + complexity);
        newCoefficients.push(coefficient);
        for (let j = 0; j < coefficient; j++) {
            const randomNum = Math.floor(Math.random() * letters.length);
            const generatedCode = randomUpperCase(letters[randomNum]);
            encryption = encryption + generatedCode;
        }
        encryptedCoefficient = encryptedCoefficient + encryption + coefficients[i];
        encryption = '';
    }
    // console.log(' ~ Coefficient encryption is done. ');
    return { encryptedPassword, encryptedCoefficient, newCoefficients };
}

function decryptPassword(encryptenData) {
    const { encryptedPassword, encryptedCoefficient, newCoefficients } = encryptenData;

    if (!encryptedPassword || !encryptedCoefficient || !newCoefficients) {
        console.error('The provided data is invalid in encryptenData');
        return encryptedPassword;
    }

    if (typeof newCoefficients !== 'string' && !Array.isArray(newCoefficients)) {
        console.error(' # THE TYPE OF ENCRYPTEN DATA IS NOT VALID!');
        console.error(' # IT HAS TO BE EITHER ARRAY OR STRING...');
        return password;
    }

    function fromStringToNumberArray(letter) {
        const arrayInNumber = [];
        for (let i = 0; i < letter.length; i++) {
            try {
                arrayInNumber.push(parseInt(letter[i]));
            } catch (error) {
                console.log('Error trying to convert the elements to number in string');
                console.log(error.message);
            }
        }

        return arrayInNumber;
    }

    if (typeof newCoefficients == 'string') {
        newCoefficients = fromStringToNumberArray(newCoefficients);
    }

    let decryptedCoefficient = '';
    let coefficientIndex = 0;
    for (let i = newCoefficients[coefficientIndex]; i < encryptedCoefficient.length; i = i + (newCoefficients[coefficientIndex] + 1)) {
        decryptedCoefficient = decryptedCoefficient + encryptedCoefficient[i];
        coefficientIndex++;
    }

    decryptedCoefficient = fromStringToNumberArray(decryptedCoefficient);

    let decryptedPassword = '';
    coefficientIndex = 0;
    for (let i = decryptedCoefficient[coefficientIndex]; i < encryptedPassword.length; i = i + (decryptedCoefficient[coefficientIndex] + 1)) {
        decryptedPassword = decryptedPassword + encryptedPassword[i];
        coefficientIndex++;
    }

    return decryptedPassword;
}

module.exports = { encryptPassword, decryptPassword };
