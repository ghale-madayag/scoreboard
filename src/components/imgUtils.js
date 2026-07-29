// Shared <img onError> handler: hide broken images instead of showing the
// browser's broken-image icon on the TV.
export function hideOnError(e) {
  e.currentTarget.style.display = 'none'
}
