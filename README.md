dev Repo for pp_reader

## Development

Run `./scripts/setup_container` once to create the virtual environment and
install dependencies. Activate the environment before running any other
scripts:

```bash
source .venv/bin/activate
```

Home Assistant can then be started with:

```bash
./scripts/develop
```

In Codex environments the setup script cannot keep the virtual
environment active. Run `source .venv/bin/activate` after the container
starts or use `./scripts/codex_develop` which directly runs the Hass
binary from the virtual environment.
