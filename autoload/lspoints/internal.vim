function lspoints#internal#notify_change_params(bufnr)
  let uri = lspoints#util#bufnr_to_uri(a:bufnr)
  let text = lspoints#util#get_text(a:bufnr)
  let changedtick = getbufvar(a:bufnr, 'changedtick')
  return [a:bufnr, uri, text, changedtick]
endfunction
function lspoints#internal#notify_change(bufnr)
  call denops#notify('lspoints', 'notifyChange', lspoints#internal#notify_change_params(a:bufnr))
endfunction
