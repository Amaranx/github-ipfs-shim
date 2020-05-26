// ==UserScript==
// @name         Mangadex IPFS Shim
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  attempts to load images from IPFS instead of Mangadex
// @author       Amaranx
// @match        https://mangadex.org/chapter/*
// @grant        unsafeWindow
// @license      MIT
// @homepage     https://openuserjs.org/scripts/va4ok
// @require      https://cdn.jsdelivr.net/npm/ipfs-http-client/dist/index.min.js
// @require      https://unpkg.com/is-ipfs/dist/index.min.js
// @require      https://unpkg.com/cids/dist/index.min.js
// @require      https://unpkg.com/ipld-dag-cbor/dist/index.min.js
// @require      https://cdn.jsdelivr.net/npm/wolfy87-eventemitter@5.2.9/EventEmitter.min.js
// ==/UserScript==

// src/ipfs.js
const CID = window.Cids
const isIpns = window.isIPFS

//change depending on local API endpoint
const clientSettings = {
    host: '127.0.0.1',
    protocol: 'http',
    port: 5001,
}
const ipfs = window.IpfsHttpClient(clientSettings)

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

function addPage(mfsPath, url) {
    let path = url //TODO make MFS path
    ipfs.files.write(path, blob, {flush:true, create:true, parents:true})
    
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

// src/shim.js
const EventEmitter = window.EventEmitter

//this is a copy of 
class ReaderPageModel extends EventEmitter {
    constructor(number, chapterId, url, ipnsUrl) {
      super()
      this._number = number
      this._chapter = chapterId
      this._state = ReaderPageModel.STATE_WAIT
      this._error = null
      this._url = url
      this._ipnsUrl = ipnsUrl
      // this._url = `https://mangadex.org/data/36887d7cffd1443feff080aa2cb416b4/M${number}.png`
      this._progress = 0
      this._image = new Image()
      this.addImageListeners()
    }
  
    get number()   { return this._number }
    get chapter()  { return this._chapter }
    get image()    { return this._image }
    get progress() { return this._progress }
    get waiting()  { return this.state === ReaderPageModel.STATE_WAIT }
    get loading()  { return this.state === ReaderPageModel.STATE_LOADING }
    get loaded()   { return this.state === ReaderPageModel.STATE_LOADED }
    get hasError() { return this.state === ReaderPageModel.STATE_ERROR }
    get isDone()   { return this.loaded || this.hasError }
    get error()    { return this._error }
    get state()    { return this._state }
    set state(v)   {
      this._state = v
      //console.log('trigger', this.number, this.stateName)
      this.trigger('statechange', [this])
    }
    get stateName() {
      switch(this.state) {
        case 0: return 'wait'
        case 1: return 'loading'
        case 2: return 'loaded'
        case 3: return 'error'
      }
    }
  
    load(breakCache = false) {
      return new Promise(async (resolve, reject) => {
        if (!breakCache && this.isDone) {
          return resolve(this)
        } else {
          if (!this.loading) {
            console.log('loading img')
            this._error = null
            //ADD
            await getPageURL(this._ipnsUrl).catch((e) => {
              if(e.message === 'file does not exist'){
                return addPage(this._ipnsUrl, this._url)
              } else { console.error(e) }
              
            })
            //SCRIPT CHANGES THIS
            //this._image.src = this._url + (breakCache ? `?t=${Date.now()}` : '')
            this._image.src = this._url + (breakCache ? `?t=${Date.now()}` : '')
            this.state = ReaderPageModel.STATE_LOADING
          }
          this.once('statechange', () => {
            switch(this.state) {
              case ReaderPageModel.STATE_LOADED: return resolve(this)
              case ReaderPageModel.STATE_ERROR:  return reject(this)
            }
          })
        }
      })
    }
  
    addImageListeners() {
      const _errorHandler = () => {
        this._error = new Error(`Image #${this.number} failed to load.`)
        this.state = ReaderPageModel.STATE_ERROR
      }
      const _loadHandler = () => {
        this.state = ReaderPageModel.STATE_LOADED

        //SCRIPT CHANGES THIS
        try { this._image.decode() } catch(e) {}
      }
      this._image.addEventListener('error', _errorHandler)
      this._image.addEventListener('load', _loadHandler)
    }
  
    reload(breakCache = false) {
      return this.load(this.hasError || breakCache)
    }
  
    static get STATE_WAIT()    { return 0 }
    static get STATE_LOADING() { return 1 }
    static get STATE_LOADED()  { return 2 }
    static get STATE_ERROR()   { return 3 }
  }
  

function _createPageCache(chapter) {
    for (let [i, page] of this._pageCache) {
      page.off()
    }
    this._pageCache.clear()
    this._preloadSet.clear()
    this._preloading = false
    for (let pg = 1; pg <= chapter.totalPages || 0; ++pg) {
      //SCRIPT CHANGES THIS
      const url = this.settings.dataSaver ? chapter.imageURL(pg).replace('/data/', '/data-saver/') : chapter.imageURL(pg)
      let ipnsUrl = new URL(chapter.imageURL(pg).replace('/data/', '')).pathname  //TODO replace
      const page = new ReaderPageModel(pg, chapter.id, url, ipnsUrl)
      this._pageCache.set(pg, page)
      page.on('statechange', (page) => {
        switch(page.state) {
          case ReaderPageModel.STATE_LOADING: return this.trigger('pageloading', [page])
          case ReaderPageModel.STATE_LOADED:  return this.trigger('pageload', [page])
          case ReaderPageModel.STATE_ERROR:   return this.trigger('pageerror', [page])
        }
      })
    }
  }

// src/index.js
// http://docs.ipfs.io.ipns.localhost:8080/reference/api/http/#api-v0-add
// 'http://127.0.0.1:8080/ipfs/QmQS1rqmjYfDWwLwRzHtEuGcpRBqDEYCS3BSVDNqdn78i8'
//ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["https://mangadex.org", "http://127.0.0.1:5001", "https://webui.ipfs.io"]'

//TODO: store upload date to check if a new chapter version is out
//TODO: add per file hash?

(async function () {
    'use strict';


    let loadReader = async() => {
        console.log("waiting for variable");
        while(!unsafeWindow.hasOwnProperty("reader")){ 
            await new Promise(resolve => setTimeout(resolve, 5));
        }
        console.log("variable is defined");
        return unsafeWindow.reader
    }

    let loadChapterInfo = async() => {
        while(reader.model.chapter === null){
            await new Promise(resolve => setTimeout(resolve, 5));
        }
        console.log("info is defined");
        return reader.model.chapter
    }

    const reader = await loadReader()
    reader.model._createPageCache = _createPageCache

    let info = loadChapterInfo()
    console.log(info)
  })();