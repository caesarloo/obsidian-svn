// 密码加密服务
// 使用简单的加密方法，实际生产环境中可以使用更复杂的加密算法

/**
 * 加密密码
 * @param password 原始密码
 * @returns 加密后的密码
 */
export function encryptPassword(password: string): string {
  if (!password) return "";
  
  // 使用简单的 Base64 编码作为示例
  // 实际生产环境中建议使用更安全的加密方法
  const encoded = btoa(unescape(encodeURIComponent(password)));
  // 添加一个简单的混淆层
  return encoded + '=='.split('').reverse().join('');
}

/**
 * 解密密码
 * @param encryptedPassword 加密后的密码
 * @returns 原始密码
 */
export function decryptPassword(encryptedPassword: string): string {
  if (!encryptedPassword) return "";
  
  try {
    // 移除混淆层
    const reversed = encryptedPassword.slice(0, -2);
    // 解码 Base64
    return decodeURIComponent(escape(atob(reversed)));
  } catch {
    // 如果解密失败，返回空字符串
    return "";
  }
}
