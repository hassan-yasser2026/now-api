export function getImageSource(image) {
  if (!image) return undefined;

  if (typeof image === 'number') {
    return image;
  }

  if (typeof image === 'string') {
    return { uri: image };
  }

  if (image.uri) {
    return image;
  }

  return undefined;
}

export function calculateCartTotal(items) {
  if (!Array.isArray(items)) return 0;

  return items.reduce((total, item) => {
    const price = Number(item?.price);
    const quantity = Number(item?.quantity);

    if (!Number.isFinite(price) || !Number.isFinite(quantity)) {
      return total;
    }

    return total + price * quantity;
  }, 0);
}