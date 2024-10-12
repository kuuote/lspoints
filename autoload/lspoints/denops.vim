" lazy load logic based on ddu.vim

let s:registered = v:false

const s:root_dir = '<sfile>'->expand()->fnamemodify(':h:h:h')
const s:sep = has('win32') ? '\' : '/'
function lspoints#denops#register() abort
  if s:registered
    return
  endif
  if denops#server#status() !=# 'running'
    autocmd User DenopsReady ++once call lspoints#denops#register()
    return
  endif
  let path = [s:root_dir, 'denops', 'lspoints', 'app.ts']->join(s:sep)
  try
    call denops#plugin#load('lspoints', path)
  catch /^Vim\%((\a\+)\)\=:E117:/
    " Fallback to `register` for backward compatibility
    call denops#plugin#register('lspoints', path, #{ mode: 'skip' })
  endtry
  let s:registered = v:true
endfunction

function lspoints#denops#notify(method, params) abort
  if !s:registered
    call lspoints#denops#register()
  endif
  call denops#plugin#wait_async('lspoints', {->denops#notify('lspoints', a:method, a:params)})
endfunction

function lspoints#denops#request(method, params, wait_async = v:false) abort
  if a:wait_async
    if !s:registered
      execute printf(
      \   'autocmd User DenopsPluginPost:lspoints call denops#request("lspoints", "%s", %s)',
      \   a:method,
      \   string(a:params),
      \ )
    else
      call denops#plugin#wait_async('lspoints', {->denops#request('lspoints', a:method, a:params)})
    endif
    return
  endif
  if !s:registered
    throw 'lspoints is not registered'
  endif
  call denops#plugin#wait('lspoints')
  return denops#request('lspoints', a:method, a:params)
endfunction

function lspoints#denops#request_async(method, params, success, failure)
  if !s:registered
    call lspoints#denops#register()
  endif
  call denops#plugin#wait_async('lspoints', {->denops#request_async('lspoints', a:method, a:params, a:success, a:failure)})
endfunction
