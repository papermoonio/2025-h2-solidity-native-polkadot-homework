#!/bin/bash

# Script to generate test output files for screenshots

echo "Generating test output files..."

# Test results summary
echo "1. Generating test results summary..."
forge test -vv > screenshots/test-results-summary.txt 2>&1
echo "   ✓ Saved to screenshots/test-results-summary.txt"

# Detailed traces
echo "2. Generating detailed test traces..."
forge test --match-contract ProxyUpgradeTest -vvvv > screenshots/test-detailed-traces.txt 2>&1
echo "   ✓ Saved to screenshots/test-detailed-traces.txt"

# Gas report
echo "3. Generating gas report..."
forge test --gas-report > screenshots/test-gas-report.txt 2>&1
echo "   ✓ Saved to screenshots/test-gas-report.txt"

# Individual test: admin protection
echo "4. Generating admin protection test details..."
forge test --match-test test_admin_change_and_protection -vvvv > screenshots/test-admin-protection.txt 2>&1
echo "   ✓ Saved to screenshots/test-admin-protection.txt"

# Individual test: upgrade functionality
echo "5. Generating upgrade test details..."
forge test --match-test test_upgrade_to_v2_and_persist_state -vvvv > screenshots/test-upgrade.txt 2>&1
echo "   ✓ Saved to screenshots/test-upgrade.txt"

echo ""
echo "All test outputs generated successfully!"
echo "You can now take screenshots of your terminal or use these text files."

