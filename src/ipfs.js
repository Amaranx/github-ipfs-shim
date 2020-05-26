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
var ipfsURL = undefined


function loadPage(mfsPath) {
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

function addPage(mfsPath, url) {
    console.log('adding file to ipfs', mfsPath, url )
    GM_xmlhttpRequest({
        method:   'GET',
        url:      url,
        responseType: 'blob',
        onload:   async function (data) {
            await ipfs.files.write(mfsPath, data.response, {parents:true, create:true, flush:true})
            return loadPage(mfsPath)
            //console.log(ipfs.files.stat(mfsPath, {hash:true}))
        },
        onerror:  function (data) {
            //alert('A page-download failed. Check the console for more details.');
            console.error(data);
        }
    });
}
