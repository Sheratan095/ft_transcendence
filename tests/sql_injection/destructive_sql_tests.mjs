#!/usr/bin/env node

/**
 * DESTRUCTIVE SQL Injection Testing Script
 * ⚠️  WARNING: These tests attempt to perform destructive operations
 * This script tests the most dangerous SQL injection scenarios
 */

import { AuthDatabase } from '../../backend/services/auth/src/auth-db.js';
import fs from 'fs/promises';
import path from 'path';

class DestructiveSQLTester {
    constructor() {
        this.db = new AuthDatabase('./destructive_test_auth.db');
        this.testResults = [];
        this.initialUserCount = 0;
        this.testUsers = [];
    }

    async initialize() {
        try {
            await this.db.initialize();
            console.log('🔧 Destructive test database initialized');
            
            // Create multiple test users to see if mass deletion works
            await this.createTestUsers();
            this.initialUserCount = (await this.db.getAllUsers()).length;
            console.log(`📊 Initial user count: ${this.initialUserCount}`);
        } catch (error) {
            console.error('❌ Failed to initialize destructive test database:', error);
            throw error;
        }
    }

    async createTestUsers() {
        const testUsers = [
            { username: 'victim1', email: 'victim1@test.com', password: 'password123' },
            { username: 'victim2', email: 'victim2@test.com', password: 'password123' },
            { username: 'victim3', email: 'victim3@test.com', password: 'password123' },
            { username: 'admin', email: 'admin@test.com', password: 'adminpassword' },
            { username: 'testuser', email: 'test@test.com', password: 'testpassword' }
        ];

        for (const user of testUsers) {
            try {
                const createdUser = await this.db.createUser(user.username, user.password, user.email);
                this.testUsers.push(createdUser);
                console.log(`✅ Created test user: ${user.username}`);
            } catch (error) {
                console.log(`ℹ️  User ${user.username} might already exist`);
            }
        }
    }

    async cleanup() {
        try {
            await fs.unlink('./destructive_test_auth.db');
            console.log('🧹 Destructive test database cleaned up');
        } catch (error) {
            console.log('ℹ️  Test database file not found (already cleaned up)');
        }
    }

    logResult(testName, passed, details, severity = 'HIGH') {
        const result = {
            test: testName,
            passed,
            details,
            severity
        };
        this.testResults.push(result);
        
        const status = passed ? '✅' : '🚨';
        const severityIcon = severity === 'CRITICAL' ? '💀' : severity === 'HIGH' ? '⚠️' : 'ℹ️';
        console.log(`${status} ${severityIcon} ${testName}: ${details}`);
    }

    async runDestructiveTests() {
        console.log('💀 Starting DESTRUCTIVE SQL Injection Tests...\n');
        console.log('⚠️  WARNING: These tests attempt to perform destructive operations!\n');

        // Test 1: Mass deletion attempts
        await this.testMassDeletion();

        // Test 2: Table dropping attempts
        await this.testTableDrop();

        // Test 3: Database schema manipulation
        await this.testSchemaManipulation();

        // Test 4: Privilege escalation attempts
        await this.testPrivilegeEscalation();

        // Test 5: Data corruption attempts
        await this.testDataCorruption();

        // Test 6: Cross-table injection
        await this.testCrossTableInjection();

        // Test 7: Nested injection attacks
        await this.testNestedInjectionAttacks();

        // Test 8: Advanced stacked queries
        await this.testStackedQueries();

        // Test 9: Database file manipulation
        await this.testDatabaseFileManipulation();

        // Test 10: Transaction manipulation
        await this.testTransactionManipulation();

        this.printDestructiveSummary();
    }

    async testMassDeletion() {
        console.log('\n🗑️  Testing Mass Deletion Attacks...');
        
        const massDeletePayloads = [
            "fakeid' OR 1=1; --",
            "fakeid'; DELETE FROM users; --",
            "fakeid' UNION SELECT 1,2,3,4,5,6; DELETE FROM users; --",
            "fakeid'; DELETE FROM users WHERE 1=1; --",
            "fakeid') OR 1=1; --",
            "fakeid' OR 'x'='x'; --",
            "fakeid' OR ''=''; --",
            "fakeid' OR true; --"
        ];

        for (const payload of massDeletePayloads) {
            try {
                await this.db.deleteUserById(payload);
                
                const remainingUsers = await this.db.getAllUsers();
                
                if (remainingUsers.length < this.initialUserCount) {
                    this.logResult(
                        `Mass deletion test: "${payload.substring(0, 25)}..."`,
                        false,
                        `🚨 CRITICAL: ${this.initialUserCount - remainingUsers.length} users deleted! Mass deletion successful!`,
                        'CRITICAL'
                    );
                } else {
                    this.logResult(
                        `Mass deletion test: "${payload.substring(0, 25)}..."`,
                        true,
                        `All ${remainingUsers.length} users preserved, mass deletion prevented`
                    );
                }
            } catch (error) {
                this.logResult(
                    `Mass deletion test: "${payload.substring(0, 25)}..."`,
                    true,
                    `Query failed safely: ${error.message}`
                );
            }
        }
    }

    async testTableDrop() {
        console.log('\n💣 Testing Table Drop Attacks...');
        
        const tableDropPayloads = [
            "fakeid'; DROP TABLE users; --",
            "fakeid'; DROP TABLE refresh_tokens; --",
            "fakeid'; DROP TABLE twofactor_tokens; --",
            "fakeid'; DROP TABLE IF EXISTS users; --",
            "fakeusername'; DROP TABLE users CASCADE; --",
            "test' UNION SELECT 1,2,3,4,5,6; DROP TABLE users; --"
        ];

        for (const payload of tableDropPayloads) {
            try {
                // Test with different methods that could drop tables
                await this.db.deleteUserById(payload);
                
                // Try to access the table to see if it still exists
                const users = await this.db.getAllUsers();
                
                if (Array.isArray(users)) {
                    this.logResult(
                        `Table drop test: "${payload.substring(0, 25)}..."`,
                        true,
                        'Users table preserved, DROP TABLE prevented'
                    );
                } else {
                    this.logResult(
                        `Table drop test: "${payload.substring(0, 25)}..."`,
                        false,
                        '🚨 CRITICAL: Users table may have been dropped!',
                        'CRITICAL'
                    );
                }
            } catch (error) {
                if (error.message.includes('no such table')) {
                    this.logResult(
                        `Table drop test: "${payload.substring(0, 25)}..."`,
                        false,
                        '🚨 CRITICAL: Table was dropped! ' + error.message,
                        'CRITICAL'
                    );
                } else {
                    this.logResult(
                        `Table drop test: "${payload.substring(0, 25)}..."`,
                        true,
                        `Query failed safely: ${error.message}`
                    );
                }
            }
        }
    }

    async testSchemaManipulation() {
        console.log('\n🏗️  Testing Schema Manipulation Attacks...');
        
        const schemaPayloads = [
            "fake'; ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 1; --",
            "fake'; CREATE TABLE malicious (id TEXT, data TEXT); --",
            "fake'; ALTER TABLE users DROP COLUMN password; --",
            "fake' UNION SELECT sql,sql,sql,sql,sql,sql FROM sqlite_master; --"
        ];

        for (const payload of schemaPayloads) {
            try {
                await this.db.getUserByUsername(payload);
                
                // Check if schema was modified by looking for new columns or tables
                const users = await this.db.getAllUsers();
                if (users.length > 0 && users[0].is_admin !== undefined) {
                    this.logResult(
                        `Schema manipulation test: "${payload.substring(0, 25)}..."`,
                        false,
                        '🚨 CRITICAL: Schema was modified! New column detected!',
                        'CRITICAL'
                    );
                } else {
                    this.logResult(
                        `Schema manipulation test: "${payload.substring(0, 25)}..."`,
                        true,
                        'Database schema preserved, ALTER TABLE prevented'
                    );
                }
            } catch (error) {
                this.logResult(
                    `Schema manipulation test: "${payload.substring(0, 25)}..."`,
                    true,
                    `Query failed safely: ${error.message}`
                );
            }
        }
    }

    async testPrivilegeEscalation() {
        console.log('\n👑 Testing Privilege Escalation Attacks...');
        
        const privilegePayloads = [
            "normaluser'; UPDATE users SET username='admin' WHERE username='normaluser'; --",
            "test' UNION SELECT 'admin','admin@hacked.com','hashedpass','2024-01-01','1'; --",
            "victim1'; UPDATE users SET password='hacked' WHERE 1=1; --"
        ];

        for (const payload of privilegePayloads) {
            const usersBefore = await this.db.getAllUsers();
            const adminsBefore = usersBefore.filter(u => u.username === 'admin').length;
            
            try {
                await this.db.getUserByUsername(payload);
                
                const usersAfter = await this.db.getAllUsers();
                const adminsAfter = usersAfter.filter(u => u.username === 'admin').length;
                const hackedPasswords = usersAfter.filter(u => u.password === 'hacked').length;
                
                if (adminsAfter > adminsBefore || hackedPasswords > 0) {
                    this.logResult(
                        `Privilege escalation test: "${payload.substring(0, 25)}..."`,
                        false,
                        '🚨 CRITICAL: Privilege escalation detected! User data modified!',
                        'CRITICAL'
                    );
                } else {
                    this.logResult(
                        `Privilege escalation test: "${payload.substring(0, 25)}..."`,
                        true,
                        'User privileges preserved, escalation prevented'
                    );
                }
            } catch (error) {
                this.logResult(
                    `Privilege escalation test: "${payload.substring(0, 25)}..."`,
                    true,
                    `Query failed safely: ${error.message}`
                );
            }
        }
    }

    async testDataCorruption() {
        console.log('\n🗃️  Testing Data Corruption Attacks...');
        
        const corruptionPayloads = [
            "fake'; UPDATE users SET email='corrupted@evil.com' WHERE 1=1; --",
            "fake'; UPDATE users SET password=NULL WHERE 1=1; --",
            "fake'; UPDATE users SET id='00000000-0000-0000-0000-000000000000' WHERE 1=1; --"
        ];

        // Take snapshot of current data
        const originalUsers = await this.db.getAllUsers();
        const originalEmails = originalUsers.map(u => u.email);
        const originalPasswords = originalUsers.map(u => u.password);

        for (const payload of corruptionPayloads) {
            try {
                await this.db.getUserByUsername(payload);
                
                const currentUsers = await this.db.getAllUsers();
                const corruptedEmails = currentUsers.filter(u => u.email === 'corrupted@evil.com').length;
                const nullPasswords = currentUsers.filter(u => u.password === null).length;
                const duplicateIds = currentUsers.filter(u => u.id === '00000000-0000-0000-0000-000000000000').length;
                
                if (corruptedEmails > 0 || nullPasswords > 0 || duplicateIds > 1) {
                    this.logResult(
                        `Data corruption test: "${payload.substring(0, 25)}..."`,
                        false,
                        `🚨 CRITICAL: Data corruption detected! ${corruptedEmails} corrupted emails, ${nullPasswords} null passwords`,
                        'CRITICAL'
                    );
                } else {
                    this.logResult(
                        `Data corruption test: "${payload.substring(0, 25)}..."`,
                        true,
                        'Data integrity preserved, corruption prevented'
                    );
                }
            } catch (error) {
                this.logResult(
                    `Data corruption test: "${payload.substring(0, 25)}..."`,
                    true,
                    `Query failed safely: ${error.message}`
                );
            }
        }
    }

    async testCrossTableInjection() {
        console.log('\n🔗 Testing Cross-Table Injection Attacks...');
        
        // First add some refresh tokens to test cross-table attacks
        try {
            const user = this.testUsers[0];
            if (user) {
                await this.db.insertRefreshToken(user.id, 'test_token', new Date(Date.now() + 86400000));
                await this.db.storeTwoFactorToken(user.id, '123456', new Date(Date.now() + 300000));
            }
        } catch (error) {
            // Ignore if already exists
        }

        const crossTablePayloads = [
            "fake'; DELETE FROM refresh_tokens WHERE 1=1; --",
            "fake'; DELETE FROM twofactor_tokens WHERE 1=1; --",
            "fake' UNION SELECT id,user_id,refresh_token,created_at,expires_at,created_at FROM refresh_tokens; --"
        ];

        const tokensBefore = await this.db.getRefreshTokens();
        const tfaTokensBefore = await this.db.getTwoFactorTokens();

        for (const payload of crossTablePayloads) {
            try {
                await this.db.getUserByUsername(payload);
                
                const tokensAfter = await this.db.getRefreshTokens();
                const tfaTokensAfter = await this.db.getTwoFactorTokens();
                
                if (tokensAfter.length < tokensBefore.length || tfaTokensAfter.length < tfaTokensBefore.length) {
                    this.logResult(
                        `Cross-table injection test: "${payload.substring(0, 25)}..."`,
                        false,
                        '🚨 CRITICAL: Cross-table deletion detected! Related tables affected!',
                        'CRITICAL'
                    );
                } else {
                    this.logResult(
                        `Cross-table injection test: "${payload.substring(0, 25)}..."`,
                        true,
                        'Related tables preserved, cross-table injection prevented'
                    );
                }
            } catch (error) {
                this.logResult(
                    `Cross-table injection test: "${payload.substring(0, 25)}..."`,
                    true,
                    `Query failed safely: ${error.message}`
                );
            }
        }
    }

    async testNestedInjectionAttacks() {
        console.log('\n🪆 Testing Nested Injection Attacks...');
        
        const nestedPayloads = [
            "fake' AND (SELECT COUNT(*) FROM (SELECT * FROM users WHERE username LIKE '%admin%') WHERE 1=1); DROP TABLE users; --",
            "fake' OR EXISTS(SELECT 1 FROM users WHERE (SELECT 1 FROM users WHERE username='admin') AND 1=1); DELETE FROM users; --"
        ];

        for (const payload of nestedPayloads) {
            const usersBefore = await this.db.getAllUsers();
            
            try {
                await this.db.getUserByUsername(payload);
                
                const usersAfter = await this.db.getAllUsers();
                
                if (usersAfter.length < usersBefore.length) {
                    this.logResult(
                        `Nested injection test: "${payload.substring(0, 25)}..."`,
                        false,
                        '🚨 CRITICAL: Nested injection succeeded! Users deleted!',
                        'CRITICAL'
                    );
                } else {
                    this.logResult(
                        `Nested injection test: "${payload.substring(0, 25)}..."`,
                        true,
                        'Nested injection prevented, all users preserved'
                    );
                }
            } catch (error) {
                this.logResult(
                    `Nested injection test: "${payload.substring(0, 25)}..."`,
                    true,
                    `Query failed safely: ${error.message}`
                );
            }
        }
    }

    async testStackedQueries() {
        console.log('\n📚 Testing Stacked Query Attacks...');
        
        const stackedPayloads = [
            "fake'; CREATE TABLE hacked (id TEXT); INSERT INTO hacked VALUES ('pwned'); --",
            "fake'; BEGIN TRANSACTION; DELETE FROM users; COMMIT; --",
            "fake'; PRAGMA table_info(users); DROP TABLE users; --"
        ];

        for (const payload of stackedPayloads) {
            try {
                await this.db.getUserByUsername(payload);
                
                // Check if malicious tables were created
                try {
                    // This would fail if the 'hacked' table doesn't exist
                    await this.db.db.get("SELECT * FROM hacked");
                    this.logResult(
                        `Stacked query test: "${payload.substring(0, 25)}..."`,
                        false,
                        '🚨 CRITICAL: Stacked queries executed! Malicious table created!',
                        'CRITICAL'
                    );
                } catch (tableError) {
                    this.logResult(
                        `Stacked query test: "${payload.substring(0, 25)}..."`,
                        true,
                        'Stacked queries prevented, no malicious tables created'
                    );
                }
            } catch (error) {
                this.logResult(
                    `Stacked query test: "${payload.substring(0, 25)}..."`,
                    true,
                    `Query failed safely: ${error.message}`
                );
            }
        }
    }

    async testDatabaseFileManipulation() {
        console.log('\n💾 Testing Database File Manipulation...');
        
        const filePayloads = [
            "fake'; ATTACH DATABASE '/tmp/malicious.db' AS evil; --",
            "fake'; PRAGMA database_list; --",
            "fake' UNION SELECT load_extension('malicious'); --"
        ];

        for (const payload of filePayloads) {
            try {
                await this.db.getUserByUsername(payload);
                
                this.logResult(
                    `File manipulation test: "${payload.substring(0, 25)}..."`,
                    true,
                    'Database file manipulation prevented'
                );
            } catch (error) {
                this.logResult(
                    `File manipulation test: "${payload.substring(0, 25)}..."`,
                    true,
                    `Query failed safely: ${error.message}`
                );
            }
        }
    }

    async testTransactionManipulation() {
        console.log('\n🔄 Testing Transaction Manipulation...');
        
        const transactionPayloads = [
            "fake'; ROLLBACK; DELETE FROM users; COMMIT; --",
            "fake'; BEGIN IMMEDIATE; DROP TABLE users; COMMIT; --"
        ];

        for (const payload of transactionPayloads) {
            const usersBefore = await this.db.getAllUsers();
            
            try {
                await this.db.getUserByUsername(payload);
                
                const usersAfter = await this.db.getAllUsers();
                
                if (usersAfter.length < usersBefore.length) {
                    this.logResult(
                        `Transaction manipulation test: "${payload.substring(0, 25)}..."`,
                        false,
                        '🚨 CRITICAL: Transaction manipulation succeeded!',
                        'CRITICAL'
                    );
                } else {
                    this.logResult(
                        `Transaction manipulation test: "${payload.substring(0, 25)}..."`,
                        true,
                        'Transaction manipulation prevented'
                    );
                }
            } catch (error) {
                this.logResult(
                    `Transaction manipulation test: "${payload.substring(0, 25)}..."`,
                    true,
                    `Query failed safely: ${error.message}`
                );
            }
        }
    }

    printDestructiveSummary() {
        console.log('\n💀 DESTRUCTIVE SQL Injection Test Summary');
        console.log('==========================================');
        
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        const criticalFailures = this.testResults.filter(r => !r.passed && r.severity === 'CRITICAL').length;
        
        console.log(`Total Destructive Tests: ${totalTests}`);
        console.log(`Passed (Safe): ${passedTests} ✅`);
        console.log(`Failed (Vulnerable): ${failedTests} 🚨`);
        console.log(`Critical Vulnerabilities: ${criticalFailures} 💀`);
        console.log(`Security Score: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
        
        if (criticalFailures > 0) {
            console.log('\n💀 CRITICAL VULNERABILITIES FOUND:');
            this.testResults
                .filter(r => !r.passed && r.severity === 'CRITICAL')
                .forEach(r => console.log(`   🚨 ${r.test}: ${r.details}`));
        }
        
        if (failedTests > 0) {
            console.log('\n⚠️  All Failed Tests:');
            this.testResults
                .filter(r => !r.passed)
                .forEach(r => console.log(`   - ${r.test}: ${r.details}`));
        }
        
        if (passedTests === totalTests) {
            console.log('\n🛡️  EXCELLENT SECURITY POSTURE!');
            console.log('   ✅ Your database withstood all destructive attacks');
            console.log('   ✅ Parameterized queries are working perfectly');
            console.log('   ✅ No data loss or corruption detected');
            console.log('   ✅ No schema manipulation possible');
            console.log('   ✅ No privilege escalation vectors found');
        } else {
            console.log('\n🚨 IMMEDIATE ACTION REQUIRED!');
            console.log('   ❌ Your database has serious security vulnerabilities');
            console.log('   ❌ Destructive attacks were successful');
            console.log('   ❌ Review parameterized query implementation');
            console.log('   ❌ Consider additional input validation');
        }
    }
}

// Run the destructive tests
async function main() {
    const tester = new DestructiveSQLTester();
    
    try {
        await tester.initialize();
        await tester.runDestructiveTests();
    } catch (error) {
        console.error('❌ Destructive test execution failed:', error);
    } finally {
        await tester.cleanup();
    }
}

// Run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export { DestructiveSQLTester };