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
    ipfs.files.write(path, urlSource(url), {flush:true, create:true, parents:true})
    
    let page_urls = chapterData.page_array.map(function(filename) {
            return chapterData.server + chapterData.hash + '/' + filename;
        })

    let interval = setInterval(() => {
        console.log('here', localStorage.getItem("parallel-downloads") || 3)

        if (active_downloads >= (localStorage.getItem("parallel-downloads") || 3) && page_urls.length > 0) {
            let to_download = page_urls.shift();
            let current_page = page_count - page_urls.length;

            active_downloads++;
            GM_xmlhttpRequest({
                method:   'GET',
                url:      to_download,
                responseType: 'blob',
                onload:   function (data) {
                    addBlob('/Mangadex/' + mangaId + '/' + chapterId + '/' + data.finalUrl.substring(data.finalUrl.lastIndexOf('/')+1), data.response)
                    //if (!failed) { setProgress(id, ((page_count -page_urls.length) /page_count) * 100); }
                    active_downloads--;
                },
                onerror:  function (data) {
                    //alert('A page-download failed. Check the console for more details.');
                    console.error(data);
                    clearInterval(interval);
                }
            });
        } else if (active_downloads === 0 && page_urls.length === 0) {
            clearInterval(interval);
        }
    }, 500);
}
