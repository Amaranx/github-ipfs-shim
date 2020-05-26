# MangaDex IPFS shim
uses IPFS as a primary cache for loading chapters at https://mangadex.org

## WARNING lots of caviats and pitfalls in using this that need to be documented

- install script https://raw.githubusercontent.com/Amaranx/github-ipfs-shim/master/release/mangadex-ipfs-shim.user.js
- install IPFS https://docs.ipfs.io/guides/guides/install/
- configure IPFS to accept requests from mangadex `ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["https://mangadex.org", "http://127.0.0.1:5001", "https://webui.ipfs.io"]'`

should be good to go?