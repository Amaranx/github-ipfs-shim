import ipfs from "./ipfs";
import _createPageCache from "./shim";


// http://docs.ipfs.io.ipns.localhost:8080/reference/api/http/#api-v0-add
// 'http://127.0.0.1:8080/ipfs/QmQS1rqmjYfDWwLwRzHtEuGcpRBqDEYCS3BSVDNqdn78i8'
//ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["https://mangadex.org", "http://127.0.0.1:5001", "https://webui.ipfs.io"]'

//TODO: store upload date to check if a new chapter version is out
//TODO: add per file hash?

(async function () {
    'use strict';
    for await (const name of ipfs.name.resolve(ipnsHead)) {
        console.info('found ipfs instance', name)
        ipfsURL = name
    }

    let loadReader = async() => {
        console.info("waiting to inject");
        while(!unsafeWindow.hasOwnProperty("reader")){ 
            await new Promise(resolve => setTimeout(resolve, 5));
        }
        return unsafeWindow.reader
    }

    let loadChapterInfo = async() => {
        while(reader.model.chapter === null){
            await new Promise(resolve => setTimeout(resolve, 5));
        }
        console.info("chapter info retreived");
        return reader.model.chapter
    }

    const reader = await loadReader()
    reader.model._createPageCache = _createPageCache
    console.info("injected");

    let info = loadChapterInfo()
    //console.log(info)

  })();