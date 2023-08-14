function s:notify_attach(name, options, bufnr)
  call denops#notify('lspoints', 'start', [a:name, a:options])
  call denops#notify('lspoints', 'attach', [a:name, a:bufnr])
endfunction

function lspoints#attach(name, options = {})
  let bufnr = bufnr()
  let name = a:name
  let options = a:options
  call denops#plugin#wait_async('lspoints', {->s:notify_attach(name, options, bufnr)})
endfunction
