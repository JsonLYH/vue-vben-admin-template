// 创建一个错误信息的队列，用于保存已经显示的错误信息
const errorQueue: any[] = [];

// 封装的函数用于显示错误信息
export const showMessage = (
  ElMessage: any,
  message: string,
  type = 'error',
  duration = 3000,
) => {
  // 检查错误信息是否已经显示过，如果已经显示则直接返回，避免重复显示
  if (errorQueue.includes(message)) {
    return;
  }
  // 添加错误信息到队列
  errorQueue.push(message);
  ElMessage({
    message,
    type,
    duration,
    onClose: () => {
      // 错误信息显示完毕后，从队列中移除
      const index = errorQueue.indexOf(message);
      if (index !== -1) {
        errorQueue.splice(index, 1);
      }
    },
  });
};
