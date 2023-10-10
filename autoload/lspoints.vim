function lspoints#_notify(method, params)
  call denops#plugin#wait_async('lspoints', {->denops#notify('lspoints', a:method, a:params)})
endfunction

function lspoints#reload()
  autocmd User DenopsPluginPost:lspoints ++once echo 'lspoints reloaded'
  call denops#plugin#reload('lspoints')
endfunction

function s:notify_attach(name, options, bufnr)
  call denops#notify('lspoints', 'start', [a:name, a:options])
  call denops#notify('lspoints', 'attach', [a:name, a:bufnr])
endfunction

function lspoints#attach(name, options = {})
  let bufnr = bufnr()
  call denops#plugin#wait_async('lspoints', {->s:notify_attach(a:name, a:options, bufnr)})
endfunction

function lspoints#load_extensions(pathes)
  call lspoints#_notify('loadExtensions', [a:pathes])
endfunction

function lspoints#get_clients(bufnr = bufnr())
  call denops#plugin#wait('lspoints')
  return denops#request('lspoints', 'getClients', [a:bufnr])
endfunction

function lspoints#request(name, method, params = {})
  call denops#plugin#wait('lspoints')
  return denops#request('lspoints', 'request', [a:name, a:method, a:params])
endfunction
