const CID = window.Cids
const isIpns = window.isIPFS
//change depending on local API endpoint
const nodeSettings = {
    host: '127.0.0.1',
    protocol: 'http',
    port: 5001,
}


const ipfs = window.IpfsHttpClient(nodeSettings)
const ipnsHead = 'QmepGawfUvLmxo43bLEbNWoeHhmtEMUuQLzs3ViBapcjDP'

function getPageURL(mfsPath) {
    return new Promise(async function(resolve, reject) { 
        try{
            const chunks = []
            for await (const chunk of ipfs.files.read(mfsPath)) {
                chunks.push(chunk)
            }
            let blob = new Blob(chunks, { type: "image/*" });
            resolve(URL.createObjectURL(blob))
        } catch(e) {
            reject(e)
        }
    })
}

function resolveIpnsWithChHash(ipnsHead, chHash) {
    return new Promise(async (resolve, reject) => {
        for await (const name of ipfs.name.resolve(ipnsHead)) {
            console.log('found ipfs record', name)
            for await (const file of ipfs.files.ls(name)) {
                if(file.name === chHash){
                    resolve(name)
                }
            }
        }
        reject('chapter not found')
    })

}

function addPage(mfsPath, url) {
    let path = mfsPath //TODO make MFS path
    
    GM_xmlhttpRequest({
        method:   'GET',
        url:      url,
        responseType: 'blob',
        onload:   function (data) {
            ipfs.files.write(path, data.response, {flush:true, create:true, parents:true})
        },
        onerror:  function (data) {
            //alert('A page-download failed. Check the console for more details.');
            console.error(data);
        }
    });
}
