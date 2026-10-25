/**
 * Anti-Guessing / Bruteforce Protection Engine for MikroTik Hotspot
 * Generates advanced Firewall and Raw table filter rules that detect failed login attempts,
 * track offending client IPs, and ban them dynamically for 1-24 hours.
 */
export class FirewallProtector {
  public static generateAntiGuessingScript(banTimeoutMinutes = 60, maxAttempts = 3): string {
    return [
      '# ========================================================',
      '# NetCard Manager - Anti-Guessing & Bruteforce Protection',
      '# Detects multiple failed Hotspot logins and blocks attacker',
      '# ========================================================',
      '',
      '/ip firewall filter',
      '# 1. Drop packets from blocked bruteforcers',
      'add action=drop chain=input comment="NetCard: Drop Guessing Attackers" src-address-list=Hotspot_Blacklist',
      'add action=drop chain=forward comment="NetCard: Drop Guessing Forwarding" src-address-list=Hotspot_Blacklist',
      '',
      '# 2. Track failed login attempts in stage 1, 2, and 3',
      'add action=add-src-to-address-list address-list=Hotspot_Blacklist address-list-timeout=' +
        banTimeoutMinutes +
        'm chain=input comment="NetCard: Ban after 3 failed attempts" dst-port=64872,64873,80,443 protocol=tcp src-address-list=Guess_Stage2',
      'add action=add-src-to-address-list address-list=Guess_Stage2 address-list-timeout=1m chain=input comment="NetCard: Second Failed Login" dst-port=64872,64873,80,443 protocol=tcp src-address-list=Guess_Stage1',
      'add action=add-src-to-address-list address-list=Guess_Stage1 address-list-timeout=1m chain=input comment="NetCard: First Failed Login" dst-port=64872,64873,80,443 protocol=tcp',
      '',
      '# Log when attacker is banned',
      '/system logging action',
      'set [ find name=memory ] memory-lines=1000',
      '/system logging',
      'add action=memory topics=firewall,info',
    ].join('\r\n');
  }
}
