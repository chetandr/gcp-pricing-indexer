const request = require('request');
const fs = require('fs');
const {red, blue, green, grey, yellow } = require('kleur');
const dataFolder = "./data";
const servicesFolder = `${dataFolder}/services`;
const skuFolder = `${dataFolder}/skus`;

const apiKey = 'AIzaSyDoNcNkRbeEWW42a5pdYi4TU7clza54PnQ';

const servicesURL = `https://cloudbilling.googleapis.com/v1/services?key=${apiKey}`;


const createFolder = folderPath => {
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
    }
}

const removeFolder = folderPath => {
    if (fs.existsSync(folderPath)) {
        fs.rmdirSync(folderPath, { recursive: true });
    }
}



const indexData = respBody => {
    const { skus } = JSON.parse(respBody);

    skus.map(sku => {
        // create a folder for  "serviceDisplayName": "Secret Manager",
        const sdFolderName = `${skuFolder}/${sku.category.serviceDisplayName.replace(/\s/g, "-").replace(/\./g, "-").replace(/\|/g, "-or-").replace(/\//g, "")}`;
        createFolder(sdFolderName);
        // create a folder for "resourceFamily": "ApplicationServices",
        const rfFolderName = `${sdFolderName}/${sku.category.resourceFamily.replace(/\s/g, "-").replace(/\./g, "-").replace(/\|/g, "-or-").replace(/\//g, "")}`;
        createFolder(rfFolderName);
        // create a folder for "resourceGroup": "SecretManager",
        const rgFolderName = `${rfFolderName}/${sku.category.resourceGroup.replace(/\s/g, "-").replace(/\./g, "-").replace(/\|/g, "-or-").replace(/\//g, "")}`;
        createFolder(rgFolderName);
        // create a folder for "usageType": "OnDemand"
        const utFolderName = `${rgFolderName}/${sku.category.usageType.replace(/\s/g, "-").replace(/\./g, "-").replace(/\|/g, "-or-").replace(/\//g, "")}`;
        createFolder(utFolderName);
        sku.serviceRegions.map(region => {
            const regionFolderName = `${utFolderName}/${region.replace(/\s/g, "-").replace(/\./g, "-").replace(/\|/g, "-or-").replace(/\//g, "")}`;
            createFolder(regionFolderName);
            const fd = fs.openSync(`${regionFolderName}/${sku.skuId}.json`, 'w+');
            fs.writeSync(fd, `${JSON.stringify(sku)}`);
            fs.closeSync(fd);
        })

    })
}
const downloadSKU = (service, nextPageToken ="" ) => {
    let squURL = `https://cloudbilling.googleapis.com/v1/services/${service.serviceId}/skus?key=${apiKey}`;
    let msg = `....Downloading ${service.displayName}`
    if(nextPageToken) {
        squURL += `&pageToken=${nextPageToken}`;
        msg += ` for the next page with token ${nextPageToken}`;
    }
    console.log(yellow(msg))
    request.get(squURL, function (err, res, body) {
        if (body) {
            const fd = fs.openSync(`${skuFolder}/${service.serviceId}.json`, 'w+');
            console.log(green(`....Indexing ${service.displayName}`))
            indexData(body)
            if (JSON.parse(body).nextPageToken) {
                downloadSKU(service, JSON.parse(body).nextPageToken)
            }
        }
    })
}
const getSKUs = () => {
    console.log(grey('Downloading SKU Definitions'))
    createFolder(skuFolder);
    const fd = fs.openSync(`${servicesFolder}/services.json`, 'r');
    const { services } = JSON.parse(fs.readFileSync(fd));
    const tasks = [];
    services.map(service => {
        const squURL = `https://cloudbilling.googleapis.com/v1/services/${service.serviceId}/skus?key=${apiKey}`;
        console.log(yellow(`....Downloading ${service.displayName}`))
        downloadSKU(service);
    })
}

const getServices = () => {
    console.log(blue('..Cleaning Old data'))
    removeFolder(dataFolder);
    console.log(green('...Creating data Folder'))
    createFolder(dataFolder);
    createFolder(servicesFolder);
    console.log(green('Downloading Service Definitions'))
    request.get(servicesURL, function (err, res, body) {
        const fd = fs.openSync(`${servicesFolder}/services.json`, 'w+');
        fs.writeSync(fd, body)
        fs.closeSync(fd);
        getSKUs();
    })
}

try { getServices() } catch (err) { console.log(err) };
//mainTask.run().then(subTask.run().catch(err => console.log(err))).catch(err => console.log(err));