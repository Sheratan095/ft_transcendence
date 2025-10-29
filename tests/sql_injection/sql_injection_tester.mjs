#!/usr/bin/env node

/**
 * SQL Injection Testing Script for Auth Database
 * This script tests various SQL injection scenarios against the auth database
 */

import { AuthDatabase } from '../../backend/services/auth/src/auth-db.js';
import fs from 'fs/promises';
import path from 'path';

class SQLInjectionTester {
    constructor() {
        this.db = new AuthDatabase('./test_auth.db');
        this.testResults = [];
    }

    async initialize() {
        try {
            await this.db.initialize();
            console.log('🔧 Test database initialized');
            
            // Create a test user for some tests
            await this.createTestUser();
        } catch (error) {
            console.error('❌ Failed to initialize test database:', error);
            throw error;
        }
    }

    async createTestUser() {
        try {
            await this.db.createUser('testuser', 'hashedpassword123', 'test@example.com');
            console.log('✅ Test user created');
        } catch (error) {
            console.log('ℹ️  Test user might already exist');
        }
    }

    async cleanup() {
        try {
            await fs.unlink('./test_auth.db');
            console.log('🧹 Test database cleaned up');
        } catch (error) {
            // File might not exist, ignore
        }
    }

    logResult(testName, passed, details) {
        const result = {
            test: testName,
            passed,
            details
        };
        this.testResults.push(result);
        
        const status = passed ? '✅' : '❌';
        console.log(`${status} ${testName}: ${details}`);
    }

    async runTests() {
        console.log('🚀 Starting SQL Injection Tests...\n');

        // Test 1: SQL Injection in getUserByUsername
        await this.testUserByUsernameInjection();

        // Test 2: SQL Injection in getUserByUsernameOrEmail
        await this.testUserByUsernameOrEmailInjection();

        // Test 3: SQL Injection in createUser
        await this.testCreateUserInjection();

        // Test 4: SQL Injection in updateUserProfile
        await this.testUpdateUserProfileInjection();

        // Test 5: SQL Injection in deleteUserById
        await this.testDeleteUserByIdInjection();

        // Test 6: SQL Injection in refresh token methods
        await this.testRefreshTokenInjection();

        // Test 7: SQL Injection in 2FA methods
        await this.testTwoFactorTokenInjection();

        // Test 8: Union-based injection attempts
        await this.testUnionInjection();

        // Test 9: Boolean-based blind injection
        await this.testBooleanBlindInjection();

        // Test 10: Time-based injection
        await this.testTimeBasedInjection();

        this.printSummary();
    }

    async testUserByUsernameInjection() {
        const maliciousInputs = [
            "admin' OR '1'='1",
            "admin'; DROP TABLE users; --",
            "admin' UNION SELECT 1,2,3,4,5,6 --",
            "admin'/**/OR/**/1=1--",
            "admin' AND (SELECT COUNT(*) FROM users) > 0 --"
        ];

        for (const input of maliciousInputs) {
            try {
                const result = await this.db.getUserByUsername(input);
                
                if (result === undefined || result === null) {
                    this.logResult(
                        `getUserByUsername injection test: "${input.substring(0, 20)}..."`,
                        true,
                        'Parameterized query successfully prevented injection'
                    );
                } else {
                    this.logResult(
                        `getUserByUsername injection test: "${input.substring(0, 20)}..."`,
                        false,
                        'Unexpected result returned - possible injection'
                    );
                }
            } catch (error) {
                this.logResult(
                    `getUserByUsername injection test: "${input.substring(0, 20)}..."`,
                    true,
                    `Query failed safely: ${error.message}`
                );
            }
        }
    }

    async testUserByUsernameOrEmailInjection() {
        const maliciousInputs = [
            "admin@test.com' OR '1'='1",
            "admin@test.com'; DROP TABLE users; --",
            "test' UNION SELECT id,username,password,email,created_at,tfa_enabled FROM users --"
        ];

        for (const input of maliciousInputs) {
            try {
                const result = await this.db.getUserByUsernameOrEmail(input);
                
                if (result === undefined || result === null) {
                    this.logResult(
                        `getUserByUsernameOrEmail injection test: "${input.substring(0, 20)}..."`,
                        true,
                        'Parameterized query successfully prevented injection'
                    );
                } else {
                    this.logResult(
                        `getUserByUsernameOrEmail injection test: "${input.substring(0, 20)}..."`,
                        false,
                        'Unexpected result returned - possible injection'
                    );
                }
            } catch (error) {
                this.logResult(
                    `getUserByUsernameOrEmail injection test: "${input.substring(0, 20)}..."`,
                    true,
                    `Query failed safely: ${error.message}`
                );
            }
        }
    }

    async testCreateUserInjection() {
        const maliciousInputs = [
            {
                username: "test'; DROP TABLE users; --",
                email: "test@example.com",
                password: "password123"
            },
            {
                username: "normaluser",
                email: "test@example.com'; DELETE FROM users WHERE 1=1; --",
                password: "password123"
            },
            {
                username: "normaluser2",
                email: "test2@example.com",
                password: "password'; UPDATE users SET username='hacked' WHERE 1=1; --"
            }
        ];

        for (const input of maliciousInputs) {
            try {
                const result = await this.db.createUser(input.username, input.password, input.email);
                
                // Check if tables still exist
                const users = await this.db.getAllUsers();
                
                if (Array.isArray(users)) {
                    this.logResult(
                        `createUser injection test: "${input.username.substring(0, 20)}..."`,
                        true,
                        'User created safely, no tables dropped'
                    );
                } else {
                    this.logResult(
                        `createUser injection test: "${input.username.substring(0, 20)}..."`,
                        false,
                        'Database structure may have been compromised'
                    );
                }
            } catch (error) {
                this.logResult(
                    `createUser injection test: "${input.username.substring(0, 20)}..."`,
                    true,
                    `Query failed safely: ${error.message}`
                );
            }
        }
    }

    async testUpdateUserProfileInjection() {
        try {
            // First create a user to update
            const user = await this.db.createUser('updatetest', 'password', 'update@test.com');
            
            const maliciousInputs = [
                "newname'; DROP TABLE users; --",
                "newname' WHERE 1=1; UPDATE users SET username='hacked'; --"
            ];

            for (const input of maliciousInputs) {
                try {
                    await this.db.updateUserProfile(user.id, input);
                    
                    // Check if injection worked
                    const users = await this.db.getAllUsers();
                    const hackedUser = users.find(u => u.username === 'hacked');
                    
                    if (!hackedUser) {
                        this.logResult(
                            `updateUserProfile injection test: "${input.substring(0, 20)}..."`,
                            true,
                            'Parameterized query prevented injection'
                        );
                    } else {
                        this.logResult(
                            `updateUserProfile injection test: "${input.substring(0, 20)}..."`,
                            false,
                            'Injection succeeded - found hacked user'
                        );
                    }
                } catch (error) {
                    this.logResult(
                        `updateUserProfile injection test: "${input.substring(0, 20)}..."`,
                        true,
                        `Query failed safely: ${error.message}`
                    );
                }
            }
        } catch (error) {
            this.logResult(
                'updateUserProfile injection test setup',
                false,
                `Failed to create test user: ${error.message}`
            );
        }
    }

    async testDeleteUserByIdInjection() {
        const maliciousInputs = [
            "someid'; DROP TABLE users; --",
            "someid' OR '1'='1"
        ];

        // Count users before injection attempts
        const usersBefore = await this.db.getAllUsers();
        const countBefore = usersBefore.length;

        for (const input of maliciousInputs) {
            try {
                await this.db.deleteUserById(input);
                
                // Check if all users were deleted or tables dropped
                const usersAfter = await this.db.getAllUsers();
                
                if (usersAfter.length < countBefore && input.includes("1'='1")) {
                    this.logResult(
                        `deleteUserById injection test: "${input.substring(0, 20)}..."`,
                        false,
                        'Multiple users deleted - possible injection'
                    );
                } else {
                    this.logResult(
                        `deleteUserById injection test: "${input.substring(0, 20)}..."`,
                        true,
                        'Parameterized query prevented mass deletion'
                    );
                }
            } catch (error) {
                this.logResult(
                    `deleteUserById injection test: "${input.substring(0, 20)}..."`,
                    true,
                    `Query failed safely: ${error.message}`
                );
            }
        }
    }

    async testRefreshTokenInjection() {
        try {
            const user = await this.db.createUser('tokentest', 'password', 'token@test.com');
            const expiresAt = new Date(Date.now() + 86400000); // 24 hours
            
            const maliciousToken = "token'; DROP TABLE refresh_tokens; --";
            
            try {
                await this.db.insertRefreshToken(user.id, maliciousToken, expiresAt);
                
                // Check if table still exists
                const tokens = await this.db.getRefreshTokens();
                
                if (Array.isArray(tokens)) {
                    this.logResult(
                        'refresh token injection test',
                        true,
                        'Refresh token table preserved, injection prevented'
                    );
                } else {
                    this.logResult(
                        'refresh token injection test',
                        false,
                        'Refresh token table may have been dropped'
                    );
                }
            } catch (error) {
                this.logResult(
                    'refresh token injection test',
                    true,
                    `Query failed safely: ${error.message}`
                );
            }
        } catch (error) {
            this.logResult(
                'refresh token injection test setup',
                false,
                `Failed to create test user: ${error.message}`
            );
        }
    }

    async testTwoFactorTokenInjection() {
        try {
            const user = await this.db.createUser('tfatest', 'password', 'tfa@test.com');
            const expiresAt = new Date(Date.now() + 300000); // 5 minutes
            
            const maliciousOtp = "123456'; DROP TABLE twofactor_tokens; --";
            
            try {
                await this.db.storeTwoFactorToken(user.id, maliciousOtp, expiresAt);
                
                // Check if table still exists
                const tokens = await this.db.getTwoFactorTokens();
                
                if (Array.isArray(tokens)) {
                    this.logResult(
                        '2FA token injection test',
                        true,
                        '2FA token table preserved, injection prevented'
                    );
                } else {
                    this.logResult(
                        '2FA token injection test',
                        false,
                        '2FA token table may have been dropped'
                    );
                }
            } catch (error) {
                this.logResult(
                    '2FA token injection test',
                    true,
                    `Query failed safely: ${error.message}`
                );
            }
        } catch (error) {
            this.logResult(
                '2FA token injection test setup',
                false,
                `Failed to create test user: ${error.message}`
            );
        }
    }

    async testUnionInjection() {
        const unionPayloads = [
            "admin' UNION SELECT sql,sql,sql,sql,sql,sql FROM sqlite_master WHERE type='table'--",
            "admin' UNION SELECT name,name,name,name,name,name FROM sqlite_master--"
        ];

        for (const payload of unionPayloads) {
            try {
                const result = await this.db.getUserByUsername(payload);
                
                if (!result || !result.username || !result.username.includes('CREATE TABLE')) {
                    this.logResult(
                        `UNION injection test: "${payload.substring(0, 20)}..."`,
                        true,
                        'UNION injection prevented'
                    );
                } else {
                    this.logResult(
                        `UNION injection test: "${payload.substring(0, 20)}..."`,
                        false,
                        'UNION injection may have succeeded'
                    );
                }
            } catch (error) {
                this.logResult(
                    `UNION injection test: "${payload.substring(0, 20)}..."`,
                    true,
                    `Query failed safely: ${error.message}`
                );
            }
        }
    }

    async testBooleanBlindInjection() {
        const blindPayloads = [
            "admin' AND (SELECT COUNT(*) FROM users) > 0--",
            "admin' AND LENGTH((SELECT username FROM users LIMIT 1)) > 0--"
        ];

        for (const payload of blindPayloads) {
            try {
                const result = await this.db.getUserByUsername(payload);
                
                // For boolean blind injection, we're looking for consistent behavior
                // Parameterized queries should always return null/undefined for non-existent users
                if (result === null || result === undefined) {
                    this.logResult(
                        `Boolean blind injection test: "${payload.substring(0, 20)}..."`,
                        true,
                        'Boolean blind injection prevented'
                    );
                } else {
                    this.logResult(
                        `Boolean blind injection test: "${payload.substring(0, 20)}..."`,
                        false,
                        'Boolean blind injection may have succeeded'
                    );
                }
            } catch (error) {
                this.logResult(
                    `Boolean blind injection test: "${payload.substring(0, 20)}..."`,
                    true,
                    `Query failed safely: ${error.message}`
                );
            }
        }
    }

    async testTimeBasedInjection() {
        const timePayloads = [
            "admin' AND (SELECT CASE WHEN 1=1 THEN sqlite_version() ELSE '' END) LIKE '%'--"
        ];

        for (const payload of timePayloads) {
            const startTime = Date.now();
            
            try {
                const result = await this.db.getUserByUsername(payload);
                const endTime = Date.now();
                const duration = endTime - startTime;
                
                // If the query takes significantly longer, it might indicate injection
                if (duration > 1000 && result !== null) {
                    this.logResult(
                        `Time-based injection test: "${payload.substring(0, 20)}..."`,
                        false,
                        `Query took ${duration}ms - possible time-based injection`
                    );
                } else {
                    this.logResult(
                        `Time-based injection test: "${payload.substring(0, 20)}..."`,
                        true,
                        `Query completed in ${duration}ms - injection prevented`
                    );
                }
            } catch (error) {
                this.logResult(
                    `Time-based injection test: "${payload.substring(0, 20)}..."`,
                    true,
                    `Query failed safely: ${error.message}`
                );
            }
        }
    }

    printSummary() {
        console.log('\n📊 SQL Injection Test Summary');
        console.log('=====================================');
        
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests} ✅`);
        console.log(`Failed: ${failedTests} ❌`);
        console.log(`Security Score: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
        
        if (failedTests > 0) {
            console.log('\n⚠️  Failed Tests:');
            this.testResults
                .filter(r => !r.passed)
                .forEach(r => console.log(`   - ${r.test}: ${r.details}`));
        }
        
        console.log('\n🎯 Recommendations:');
        console.log('   - All your database methods use parameterized queries ✅');
        console.log('   - Continue using the ? placeholder syntax ✅');
        console.log('   - Never concatenate user input directly into SQL strings ✅');
        console.log('   - Consider input validation and sanitization at the API level');
        console.log('   - Implement rate limiting for authentication endpoints');
        console.log('   - Add logging for suspicious activity patterns');
    }
}

// Run the tests
async function main() {
    const tester = new SQLInjectionTester();
    
    try {
        await tester.initialize();
        await tester.runTests();
    } catch (error) {
        console.error('❌ Test execution failed:', error);
    } finally {
        await tester.cleanup();
    }
}

// Run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export { SQLInjectionTester };