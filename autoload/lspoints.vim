let g:lspoints#extensions = get(g:, 'lspoints#extensions', [])

function lspoints#reload()
  autocmd User DenopsPluginPost:lspoints ++once echo 'lspoints reloaded'
  call denops#plugin#reload('lspoints')
endfunction

function lspoints#attach(name, options = {})
  call lspoints#denops#register()
  let bufnr = bufnr()
  call lspoints#denops#notify('start', [a:name, a:options])
  call lspoints#denops#notify('attach', [a:name, bufnr])
endfunction

" notify method

function lspoints#load_extensions(pathes)
  call extend(g:lspoints#extensions, a:pathes)
  if denops#plugin#is_loaded('lspoints')
    call lspoints#denops#notify('loadExtensions', [a:pathes])
  endif
endfunction

function lspoints#notify(name, method, params = {})
  call lspoints#denops#notify('notify', [a:name, a:method, a:params])
endfunction

" request method

function lspoints#get_clients(bufnr = bufnr())
  return lspoints#denops#request('getClients', [a:bufnr])
endfunction

function lspoints#request(name, method, params = {})
  return lspoints#denops#request('request', [a:name, a:method, a:params])
endfunction
