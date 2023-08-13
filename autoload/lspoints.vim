function s:notify_attach(name, command, options)
  call denops#notify('lspoints', 'start', [a:name, a:command, a:options])
  call denops#notify('lspoints', 'attach', [a:name, bufnr()])
endfunction

function lspoints#attach(name, command, options = {})
  let name = a:name
  let command = a:command
  let options = a:options
  call denops#plugin#wait_async('lspoints', {->s:notify_attach(name, command, options)})
endfunction
