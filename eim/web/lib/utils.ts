import { Toast } from 'antd-mobile';

export function showSuccessToast(content: string) {
  Toast.show({
    content,
    icon: 'success',
  });
}

export function showErrorToast(content: string) {
  Toast.show({
    content,
    icon: 'fail',
  });
}

export function showLoadingToast(content: string) {
  Toast.show({
    content,
    icon: 'loading',
  });
}
