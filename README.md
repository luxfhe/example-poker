# 🏗 luxfhe KUHN POKER

LuxFHE Kuhn Poker is a POC demonstrating on-chain randomness using LuxFHE's new `random` functionality.

This dApp is currently in a WIP state, and will be released in full after the deployment of the LuxFHE Nitrogen testnet, which introduces the randomness functionality.

Additionally, this repo includes utilities for interacting with the luxfhe blockchain,
such as `useLuxFHEScaffoldContractRead` which automatically injects LuxFHE permissions into read calls and decrypts sealed outputs, and `useLuxFHEScaffoldContractWrite` which automatically encrypts input variables before they are sent to the chain to be consumed as `inEuint` varieties.

Video demonstration of FHE kuhn poker:



https://github.com/user-attachments/assets/b764d7c7-f0d4-4316-8e18-d538715f4ba6

