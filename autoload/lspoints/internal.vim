function lspoints#internal#notify_change_params(bufnr)
  let changedtick = getbufvar(a:bufnr, 'changedtick')
  " Note: can't get changedtick from wiped buffer
  if empty(changedtick)
    return
  endif
  let uri = lspoints#util#bufnr_to_uri(a:bufnr)
  let text = lspoints#util#get_text(a:bufnr)
  return [a:bufnr, uri, text, changedtick]
endfunction

function lspoints#internal#notify_change(bufnr)
  let params = lspoints#internal#notify_change_params(a:bufnr)
  if empty(params)
    return
  endif
  call denops#notify('lspoints', 'notifyChange', params)
endfunction
