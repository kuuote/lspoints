" lazy load logic based on https://github.com/Shougo/ddu.vim/blob/main/autoload/ddu.vim

let s:registered = v:false

const s:root_dir = '<sfile>'->expand()->fnamemodify(':h:h:h')
const s:sep = has('win32') ? '\' : '/'
function lspoints#denops#register()
  if denops#server#status() !=# 'running'
    autocmd User DenopsReady ++once call lspoints#denops#register()
    return
  endif
  call denops#plugin#register('lspoints',
  \   [s:root_dir, 'denops', 'lspoints', 'app.ts']->join(s:sep),
  \   #{ mode: 'skip' },
  \ )
  let s:registered = v:true
endfunction

function lspoints#denops#notify(method, params)
  if !s:registered
    execute printf(
    \   'autocmd User DenopsPluginPost:lspoints call denops#notify("lspoints", "%s", %s)',
    \   a:method,
    \   string(a:params),
    \ )
  endif
  call denops#plugin#wait_async('lspoints', {->denops#notify('lspoints', a:method, a:params)})
endfunction

function lspoints#denops#request(method, params)
  if !s:registered
    throw 'lspoints is not registered'
  endif
  call denops#plugin#wait('lspoints')
  return denops#request('lspoints', a:method, a:params)
endfunction
