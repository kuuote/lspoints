function! lspoints#settings#get() abort
  return lspoints#denops#request('getSettings', [])
endfunction

function! lspoints#settings#set(settings) abort
  call lspoints#denops#request('setSettings', [a:settings], v:true)
endfunction

function! lspoints#settings#patch(settings) abort
  call lspoints#denops#request('patchSettings', [a:settings], v:true)
endfunction
