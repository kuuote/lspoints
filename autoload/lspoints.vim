function lspoints#reload()
  autocmd User DenopsPluginPost:lspoints ++once echo 'lspoints reloaded'
  call denops#plugin#reload('lspoints')
endfunction

function lspoints#attach(name, options = {})
  let bufnr = bufnr()
  call lspoints#denops#notify('start', [a:name, a:options])
  call lspoints#denops#notify('attach', [a:name, bufnr])
endfunction

function lspoints#load_extensions(pathes)
  call lspoints#denops#notify('loadExtensions', [a:pathes])
endfunction

function lspoints#get_clients(bufnr = bufnr())
  return lspoints#denops#request('getClients', [a:bufnr])
endfunction

function lspoints#notify(name, method, params = {})
  call lspoints#denops#notify('notify', [a:method, a:params])
endfunction

function lspoints#request(name, method, params = {})
  return lspoints#denops#request('lspoints', 'request', [a:name, a:method, a:params])
endfunction
