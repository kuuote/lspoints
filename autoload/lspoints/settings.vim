function! lspoints#settings#get() abort
  call denops#plugin#wait('lspoints')
  return denops#request('lspoints', 'getSettings', [])
endfunction

function! lspoints#settings#set(settings) abort
  call lspoints#denops#notify('setSettings', [a:settings])
endfunction

function! lspoints#settings#patch(settings) abort
  call lspoints#denops#notify('patchSettings', [a:settings])
endfunction
