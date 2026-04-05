from web3 import Web3
from eth_account import Account
import certifi
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from core.config import RPC_URLS, RPC_TRUST_ENV, CONTRACT_ADDRESS, OWNER_PRIVATE_KEY

RPC_TIMEOUT_SECONDS = 30
RPC_STATUS_RETRY_CODES = [429, 500, 502, 503, 504]

# --- Contract ABI (only the functions we need) ---
CONTRACT_ABI = [
    {
        "inputs": [
            {"internalType": "bytes32", "name": "_messageHash", "type": "bytes32"},
            {"internalType": "address", "name": "_offender", "type": "address"},
            {"internalType": "address[3]", "name": "_moderators", "type": "address[3]"}
        ],
        "name": "createCase",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "caseCount",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "_caseId", "type": "uint256"}],
        "name": "getCase",
        "outputs": [
            {"internalType": "bytes32", "name": "messageHash", "type": "bytes32"},
            {"internalType": "address", "name": "offender", "type": "address"},
            {"internalType": "address[3]", "name": "moderators", "type": "address[3]"},
            {"internalType": "uint8", "name": "voteCount", "type": "uint8"},
            {"internalType": "bool", "name": "resolved", "type": "bool"},
            {"internalType": "uint8", "name": "decision", "type": "uint8"},
            {"internalType": "uint256", "name": "createdAt", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "uint256", "name": "_caseId", "type": "uint256"},
            {"internalType": "address", "name": "_moderator", "type": "address"}
        ],
        "name": "getVote",
        "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "uint256", "name": "_caseId", "type": "uint256"},
            {"internalType": "uint8", "name": "_vote", "type": "uint8"}
        ],
        "name": "castVote",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "uint256", "name": "caseId", "type": "uint256"},
            {"indexed": False, "internalType": "bytes32", "name": "messageHash", "type": "bytes32"},
            {"indexed": False, "internalType": "address", "name": "offender", "type": "address"},
            {"indexed": False, "internalType": "address[3]", "name": "moderators", "type": "address[3]"}
        ],
        "name": "CaseCreated",
        "type": "event"
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "uint256", "name": "caseId", "type": "uint256"},
            {"indexed": False, "internalType": "uint8", "name": "decision", "type": "uint8"}
        ],
        "name": "CaseResolved",
        "type": "event"
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "uint256", "name": "caseId", "type": "uint256"},
            {"indexed": True, "internalType": "address", "name": "moderator", "type": "address"},
            {"indexed": False, "internalType": "uint8", "name": "vote", "type": "uint8"}
        ],
        "name": "VoteCast",
        "type": "event"
    }
]

OWNER_ADDRESS = Account.from_key(OWNER_PRIVATE_KEY).address

_rpc_urls = list(dict.fromkeys([url for url in RPC_URLS if url]))
_current_rpc_index = 0
ACTIVE_RPC_URL = _rpc_urls[0] if _rpc_urls else None
w3 = None
contract = None


def _build_http_session() -> requests.Session:
    session = requests.Session()
    session.verify = certifi.where()
    session.trust_env = RPC_TRUST_ENV

    retry = Retry(
        total=3,
        connect=3,
        read=3,
        status=3,
        backoff_factor=0.5,
        status_forcelist=RPC_STATUS_RETRY_CODES,
        allowed_methods=frozenset({"GET", "POST", "HEAD", "OPTIONS"}),
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry, pool_connections=10, pool_maxsize=10)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


def _build_provider(endpoint_url: str) -> Web3:
    return Web3(
        Web3.HTTPProvider(
            endpoint_url,
            request_kwargs={"timeout": RPC_TIMEOUT_SECONDS},
            session=_build_http_session(),
        )
    )


def _select_provider(preferred_index: int = 0) -> bool:
    global w3, contract, ACTIVE_RPC_URL, _current_rpc_index

    if not _rpc_urls:
        raise RuntimeError("No RPC_URL configured")

    indexes = list(range(len(_rpc_urls)))
    if preferred_index in indexes:
        indexes.remove(preferred_index)
        indexes.insert(0, preferred_index)

    last_error = None

    for index in indexes:
        endpoint_url = _rpc_urls[index]
        try:
            candidate = _build_provider(endpoint_url)
            connected = candidate.is_connected()
            print(f"Web3 connected via {endpoint_url}: {connected}")
            if not connected:
                continue

            w3 = candidate
            contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)
            ACTIVE_RPC_URL = endpoint_url
            _current_rpc_index = index
            return True
        except Exception as exc:
            last_error = exc
            print(f"RPC init failed for {endpoint_url}: {exc}")

    if last_error:
        print(f"No RPC endpoint connected successfully. Last error: {last_error}")
    return False


def _looks_like_transport_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return any(
        token in message
        for token in (
            "ssl",
            "certificate",
            "remote end closed connection",
            "connection aborted",
            "max retries exceeded",
            "temporarily unavailable",
            "read timed out",
            "connection reset",
        )
    )


def _with_rpc_failover(operation, context: str):
    if w3 is None or contract is None:
        _select_provider(_current_rpc_index)

    try:
        return operation()
    except Exception as exc:
        if len(_rpc_urls) <= 1 or not _looks_like_transport_error(exc):
            raise

        original_index = _current_rpc_index
        print(f"{context}: RPC transport issue on {ACTIVE_RPC_URL}: {exc}")

        for offset in range(1, len(_rpc_urls)):
            next_index = (original_index + offset) % len(_rpc_urls)
            if not _select_provider(next_index):
                continue
            try:
                return operation()
            except Exception as retry_exc:
                print(f"{context}: retry on {ACTIVE_RPC_URL} failed: {retry_exc}")
                exc = retry_exc

        raise exc


_select_provider(0)
print(f"Owner address: {OWNER_ADDRESS}")
print(f"RPC session trust_env: {RPC_TRUST_ENV}")


def create_case_on_chain(message_hash_hex: str, offender_address: str, moderator_addresses: list) -> dict:
    """
    Call SentinelDAO.createCase() on Sepolia.
    """
    try:
        if message_hash_hex.startswith("0x"):
            message_hash_hex = message_hash_hex[2:]
        message_hash_bytes = bytes.fromhex(message_hash_hex.ljust(64, '0')[:64])

        offender = Web3.to_checksum_address(offender_address)
        moderators = [Web3.to_checksum_address(addr) for addr in moderator_addresses[:3]]

        while len(moderators) < 3:
            moderators.append(Web3.to_checksum_address("0x0000000000000000000000000000000000000000"))

        nonce = _with_rpc_failover(
            lambda: w3.eth.get_transaction_count(OWNER_ADDRESS),
            "create_case_on_chain:get_transaction_count",
        )
        gas_price = _with_rpc_failover(
            lambda: w3.eth.gas_price,
            "create_case_on_chain:gas_price",
        )

        tx = contract.functions.createCase(
            message_hash_bytes,
            offender,
            moderators
        ).build_transaction({
            'from': OWNER_ADDRESS,
            'nonce': nonce,
            'gas': 300000,
            'gasPrice': gas_price,
            'chainId': 11155111
        })

        signed_tx = w3.eth.account.sign_transaction(tx, OWNER_PRIVATE_KEY)
        tx_hash = _with_rpc_failover(
            lambda: w3.eth.send_raw_transaction(signed_tx.raw_transaction),
            "create_case_on_chain:send_raw_transaction",
        )

        print(f"TX sent via {ACTIVE_RPC_URL}: {tx_hash.hex()}")

        receipt = _with_rpc_failover(
            lambda: w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120),
            "create_case_on_chain:wait_for_receipt",
        )

        if receipt.status == 1:
            logs = contract.events.CaseCreated().process_receipt(receipt)
            case_id = logs[0]['args']['caseId'] if logs else None

            print(f"Case created on-chain. Case ID: {case_id}")
            print(f"   TX: https://sepolia.etherscan.io/tx/{tx_hash.hex()}")

            return {
                "success": True,
                "tx_hash": tx_hash.hex(),
                "case_id": case_id,
                "block_number": receipt.blockNumber
            }

        print(f"TX failed. Receipt: {receipt}")
        return {"success": False, "error": "Transaction reverted", "tx_hash": tx_hash.hex()}

    except Exception as e:
        print(f"Blockchain error: {e}")
        return {"success": False, "error": str(e)}


def get_case_from_chain(case_id: int) -> dict:
    """Read case data from the smart contract"""
    try:
        result = _with_rpc_failover(
            lambda: contract.functions.getCase(case_id).call(),
            f"get_case_from_chain:{case_id}",
        )
        return {
            "message_hash": result[0].hex(),
            "offender": result[1],
            "moderators": list(result[2]),
            "vote_count": result[3],
            "resolved": result[4],
            "decision": result[5],
            "created_at": result[6]
        }
    except Exception as e:
        print(f"Error reading case {case_id}: {e}")
        return None


def get_case_count() -> int:
    """Get total number of cases on-chain"""
    try:
        return _with_rpc_failover(
            lambda: contract.functions.caseCount().call(),
            "get_case_count",
        )
    except Exception as e:
        print(f"Error getting case count: {e}")
        return 0


def check_resolved_cases(from_block: int = None) -> list:
    """Check for CaseResolved events"""
    try:
        if from_block is None:
            from_block = _with_rpc_failover(
                lambda: w3.eth.block_number,
                "check_resolved_cases:block_number",
            ) - 1000

        events = _with_rpc_failover(
            lambda: contract.events.CaseResolved.get_logs(fromBlock=from_block),
            "check_resolved_cases:get_logs",
        )

        resolved = []
        for event in events:
            resolved.append({
                "case_id": event['args']['caseId'],
                "decision": event['args']['decision'],
                "block_number": event['blockNumber'],
                "tx_hash": event['transactionHash'].hex()
            })

        return resolved
    except Exception as e:
        print(f"Error checking resolved cases: {e}")
        return []


def verify_vote_on_chain(case_id: int, moderator_address: str) -> dict:
    """
    Verify that a moderator has voted on a case on-chain.
    Uses getVote() which returns 0 = not voted, 1 = punish, 2 = dismiss.
    """
    try:
        moderator = Web3.to_checksum_address(moderator_address)
        vote_value = _with_rpc_failover(
            lambda: contract.functions.getVote(case_id, moderator).call(),
            f"verify_vote_on_chain:{case_id}:{moderator_address}",
        )
        return {
            "has_voted": vote_value > 0,
            "vote": vote_value,
        }
    except Exception as e:
        print(f"Error verifying vote for case {case_id}, moderator {moderator_address}: {e}")
        return {"has_voted": False, "vote": 0, "error": str(e)}
