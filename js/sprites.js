function trySwapSprite(placeholderEl, imageSrc) {
  const probe = new Image();
  probe.onload = () => {
    placeholderEl.innerHTML = '';
    const imgEl = document.createElement('img');
    imgEl.src = imageSrc;
    imgEl.className = 'sprite-img';
    imgEl.alt = '';
    placeholderEl.appendChild(imgEl);
  };
  probe.src = imageSrc;
}
