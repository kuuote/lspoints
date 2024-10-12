let g:lspoints#extensions = get(g:, 'lspoints#extensions', [])

" async method

function lspoints#reload() abort
  autocmd User DenopsPluginPost:lspoints ++once echo 'lspoints reloaded'
  call denops#plugin#reload('lspoints')
endfunction

function lspoints#start(name, options = {}) abort
  call lspoints#denops#register()
  call lspoints#denops#notify('start', [a:name, a:options])
endfunction

function lspoints#attach(name, options = {}) abort
  call lspoints#start(a:name, a:options)
  let bufnr = bufnr()
  call lspoints#denops#notify('attach', [a:name, bufnr])
endfunction

function lspoints#load_extensions(pathes) abort
  call extend(g:lspoints#extensions, a:pathes)
  if denops#plugin#is_loaded('lspoints')
    call lspoints#denops#notify('loadExtensions', [a:pathes])
  endif
endfunction

function lspoints#notify(name, method, params = {}) abort
  call lspoints#denops#notify('notify', [a:name, a:method, a:params])
endfunction

function lspoints#request_async(name, method, params = {}, success, failure) abort
  call lspoints#denops#request_async('request', [a:name, a:method, a:params], success, failure)
endfunction

" sync method

function lspoints#get_clients(bufnr = bufnr()) abort
  return lspoints#denops#request('getClients', [a:bufnr])
endfunction

function lspoints#request(name, method, params = {}) abort
  return lspoints#denops#request('request', [a:name, a:method, a:params])
endfunction
