function lspoints#denops#notify(method, params)
  call denops#plugin#wait_async('lspoints', {->denops#notify('lspoints', a:method, a:params)})
endfunction

function lspoints#denops#request(method, params)
  call denops#plugin#wait('lspoints')
  return denops#request('lspoints', a:method, a:params)
endfunction
